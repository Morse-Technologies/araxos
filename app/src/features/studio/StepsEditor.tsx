"use client";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { Step, StepKind } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { stepKindLabel } from "@/lib/labels";
import { Button, Input, Select, Textarea } from "@/ui/atoms";
import { Field, fieldProps, SafetyTag, stepKindIcon } from "@/ui/cells";

const KINDS = Object.keys(stepKindLabel) as StepKind[];

/** E1 steps: drag (or Space and the arrows) to reorder, pick one to edit it. Numbers follow the order. */
export function StepsEditor({ steps, onChange, selected, onSelect, readOnly }: {
  steps: Step[]; onChange: (s: Step[]) => void; selected: string | null; onSelect: (k: string) => void; readOnly: boolean;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = steps.findIndex((s) => s.key === active.id), to = steps.findIndex((s) => s.key === over.id);
    onChange(arrayMove(steps, from, to).map((s, i) => ({ ...s, n: i + 1 })));
  };
  const step = steps.find((s) => s.key === selected) ?? steps[0];
  const update = (x: Partial<Step>) => onChange(steps.map((s) => (s.key === step.key ? { ...s, ...x } : s)));
  const add = () => {
    const key = `s${Math.max(0, ...steps.map((s) => Number(s.key.slice(1)) || 0)) + 1}`;
    onChange([...steps, { key, n: steps.length + 1, kind: "instruction", title: "New step", body: "", minutes: 5, requirements: [], cite: null, range: null, lock: null, branches: [] }]);
    onSelect(key);
  };
  const remove = () => { onChange(steps.filter((s) => s.key !== step.key).map((s, i) => ({ ...s, n: i + 1 }))); onSelect(steps[0].key); };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={steps.map((s) => s.key)} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-1.5" aria-label="Steps">
              {steps.map((s) => <Row key={s.key} step={s} active={s.key === step?.key} onSelect={() => onSelect(s.key)} readOnly={readOnly} />)}
            </ol>
          </SortableContext>
        </DndContext>
        {!readOnly && <Button variant="ghost" className="self-start" onClick={add}><Plus />Add step</Button>}
      </div>
      {step && (
        <div className="flex flex-col gap-4 rounded-card border border-border p-5" aria-label={`Step ${step.n}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-section font-medium">Step {step.n}</h3>
            {!readOnly && <Button variant="danger" size="sm" onClick={remove} disabled={steps.length < 2}><Trash2 />Remove</Button>}
          </div>
          <fieldset disabled={readOnly} className="flex flex-col gap-4">
            <Field label="Title">{(f) => <Input {...fieldProps(f)} value={step.title} onChange={(e) => update({ title: e.target.value })} />}</Field>
            <Field label="What to do">{(f) => <Textarea {...fieldProps(f)} rows={3} value={step.body} onChange={(e) => update({ body: e.target.value })} />}</Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kind">{(f) => <Select {...fieldProps(f)} value={step.kind} onChange={(e) => update({ kind: e.target.value as StepKind })}>{KINDS.map((k) => <option key={k} value={k}>{stepKindLabel[k]}</option>)}</Select>}</Field>
              <Field label="Minutes">{(f) => <Input {...fieldProps(f)} type="number" min={1} value={step.minutes} onChange={(e) => update({ minutes: Number(e.target.value) })} />}</Field>
            </div>
            {step.range && (
              <div className="grid grid-cols-3 gap-4">
                <Field label="Min">{(f) => <Input {...fieldProps(f)} inputMode="decimal" value={step.range!.min} onChange={(e) => update({ range: { ...step.range!, min: Number(e.target.value) } })} />}</Field>
                <Field label="Max">{(f) => <Input {...fieldProps(f)} inputMode="decimal" value={step.range!.max} onChange={(e) => update({ range: { ...step.range!, max: Number(e.target.value) } })} />}</Field>
                <Field label="Unit">{(f) => <Input {...fieldProps(f)} value={step.range!.unit} onChange={(e) => update({ range: { ...step.range!, unit: e.target.value } })} />}</Field>
              </div>
            )}
            {step.lock && (
              <p className="flex flex-wrap items-center gap-2 text-body"><SafetyTag />{step.lock.action === "apply" ? "Apply" : "Remove"} lock on <span className="font-mono">{step.lock.point}</span> · {step.lock.energy}</p>
            )}
            {step.cite && <p className="text-small text-muted">Cites {step.cite.doc}, p. {step.cite.page}: “{step.cite.quote}”</p>}
            {!!step.branches.length && <p className="text-small text-muted">Branches: {step.branches.map((b) => `${b.label} → step ${steps.find((s) => s.key === b.to)?.n ?? "?"}`).join(" · ")}</p>}
          </fieldset>
        </div>
      )}
    </div>
  );
}

function Row({ step, active, onSelect, readOnly }: { step: Step; active: boolean; onSelect: () => void; readOnly: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.key, disabled: readOnly });
  const Icon = stepKindIcon[step.kind];
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 rounded-control border border-border bg-surface px-2 py-2", active && "border-text", isDragging && "z-10 shadow-[var(--shadow-float)]")}>
      {!readOnly && <button type="button" {...attributes} {...listeners} aria-label={`Move step ${step.n}`} className="cursor-grab touch-none p-1 text-faint hover:text-text"><GripVertical className="size-4" /></button>}
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left text-body">
        <span className="w-5 text-small text-muted num">{step.n}</span>
        <Icon className="size-4 flex-none text-muted" aria-hidden />
        <span className="truncate">{step.title}</span>
        {step.kind === "safety" && <span className="ml-auto"><SafetyTag /></span>}
      </button>
    </li>
  );
}
