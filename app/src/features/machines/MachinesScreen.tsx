"use client";
import { Plus, Printer } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PLANT_ID, useCases, useCreateMachine, useMachines, usePlants, useProcedures } from "@/features/hooks";
import type { Machine } from "@/lib/api/types";
import { fmtNum } from "@/lib/format";
import { useEnter } from "@/lib/gsapIn";
import { Button, Input, Select } from "@/ui/atoms";
import { DataTable, EmptyState, ErrorState, Field, fieldProps, KeyValues, LoadingRows, PageHeader, Sheet } from "@/ui/cells";
import { Canvas } from "@/ui/templates/ShellLayout";
import { qrModules } from "./qrGrid";

export function MachinesScreen() {
  const machines = useMachines();
  const [open, setOpen] = useState<Machine | null>(null);
  const [adding, setAdding] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEnter(root);

  return (
    <Canvas>
      <div ref={root} className="flex flex-col gap-5">
        <PageHeader
          title="Machines"
          subline="Plant assets with their codes, areas and printable QR labels."
          actions={<Button variant="primary" onClick={() => setAdding(true)}><Plus />Add machine</Button>}
        />
        {machines.isPending ? <LoadingRows rows={8} pitch="h-12" />
          : machines.isError ? <ErrorState what="machines" onRetry={() => machines.refetch()} />
            : !machines.data.length ? <EmptyState action={<Button size="sm" variant="primary" onClick={() => setAdding(true)}><Plus />Add machine</Button>}>No machines yet.</EmptyState>
              : (
                <DataTable
                  label="Machines"
                  rows={machines.data}
                  rowKey={(m) => m.id}
                  onRow={setOpen}
                  selected={open?.id ?? null}
                  minWidth={960}
                  columns={[
                    { key: "c", label: "Code", cell: (m) => <span className="font-medium num">{m.code}</span> },
                    { key: "n", label: "Name", cell: (m) => m.name },
                    { key: "k", label: "Kind", cell: (m) => m.kind },
                    { key: "a", label: "Area / line", cell: (m) => <span className="text-muted">{m.area} · {m.line}</span> },
                    { key: "o", label: "Open cases", className: "text-right", cell: (m) => <span className="num">{fmtNum(m.openCases)}</span> },
                    { key: "p", label: "Approved procedures", className: "text-right", cell: (m) => <span className="num">{fmtNum(m.procedures)}</span> },
                    { key: "v", label: "Viper", cell: (m) => (m.viperCode ? "Yes" : "No") },
                  ]}
                />
              )}
      </div>
      <MachineSheet machine={open} onClose={() => setOpen(null)} />
      <Sheet open={adding} onOpenChange={setAdding} title="Add machine" description="A code, kind and area. The QR is generated from the code.">
        <AddMachineForm onDone={() => setAdding(false)} />
      </Sheet>
    </Canvas>
  );
}

function MachineSheet({ machine, onClose }: { machine: Machine | null; onClose: () => void }) {
  const [last, setLast] = useState(machine);
  if (machine && machine !== last) setLast(machine);
  const m = machine ?? last;
  const cases = useCases();
  const procedures = useProcedures();
  const openCases = useMemo(
    () => (cases.data ?? []).filter((c) => m && c.machineId === m.id && c.status !== "closed"),
    [cases.data, m],
  );
  const kindProcs = useMemo(
    () => (procedures.data ?? []).filter((p) => m && p.machineKind === m.kind),
    [procedures.data, m],
  );
  const modules = useMemo(() => (m ? qrModules(m.qr) : []), [m]);

  return (
    <Sheet open={!!machine} onOpenChange={(o) => { if (!o) onClose(); }} title={m ? `${m.code} · ${m.name}` : ""} description={m?.kind}>
      {m && (
        <div className="flex flex-col gap-6 px-5 py-4">
          <KeyValues rows={[
            { k: "Code", v: <span className="num">{m.code}</span> },
            { k: "Kind", v: m.kind },
            { k: "Area", v: `${m.area} · ${m.line}` },
            { k: "Viper", v: m.viperCode ?? "Not linked" },
            { k: "Open cases", v: <span className="num">{fmtNum(m.openCases)}</span> },
            { k: "Approved procedures", v: <span className="num">{fmtNum(m.procedures)}</span> },
          ]} />
          <section>
            <h3 className="text-body font-medium">Open cases</h3>
            {!openCases.length ? <p className="mt-2 text-body text-muted">None open.</p> : (
              <ul className="mt-2 flex flex-col divide-y divide-rule">
                {openCases.map((c) => (
                  <li key={c.id} className="py-2">
                    <Link href={`/cases?id=${c.id}`} className="text-body underline-offset-4 hover:underline">{c.code} · {c.symptom}</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="text-body font-medium">Procedures for this kind</h3>
            {!kindProcs.length ? <p className="mt-2 text-body text-muted">No procedures for {m.kind}.</p> : (
              <ul className="mt-2 flex flex-col divide-y divide-rule">
                {kindProcs.map((p) => (
                  <li key={p.id} className="py-2">
                    <Link href={`/studio?id=${p.id}`} className="text-body underline-offset-4 hover:underline">
                      <span className="num">{p.code}</span> · {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="flex flex-col items-start gap-3">
            <h3 className="text-body font-medium">QR label</h3>
            <QrSvg modules={modules} label={m.code} />
            <p className="text-small text-muted font-mono">{m.qr}</p>
            <Button variant="outline" onClick={() => window.print()}><Printer />Print QR label</Button>
          </section>
        </div>
      )}
    </Sheet>
  );
}

function QrSvg({ modules, label }: { modules: boolean[][]; label: string }) {
  const n = modules.length;
  const cell = 8;
  const pad = 16;
  const size = n * cell + pad * 2;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`QR for ${label}`} className="rounded-control bg-surface text-text">
      <rect width={size} height={size} className="fill-surface" />
      {modules.map((row, y) => row.map((on, x) => on && (
        <rect key={`${x}-${y}`} x={pad + x * cell} y={pad + y * cell} width={cell} height={cell} className="fill-text" />
      )))}
    </svg>
  );
}

function AddMachineForm({ onDone }: { onDone: () => void }) {
  const create = useCreateMachine();
  const plants = usePlants();
  const machines = useMachines();
  const plant = plants.data?.find((p) => p.id === PLANT_ID);
  const kinds = useMemo(
    () => [...new Set((machines.data ?? []).map((m) => m.kind))].sort(),
    [machines.data],
  );
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState("");
  const [area, setArea] = useState("");
  const [line, setLine] = useState("");
  const areaValue = area || plant?.areas[0] || "";
  const lineValue = line || plant?.lines[0] || "";
  const ready = code.trim() && name.trim() && kind.trim() && areaValue && lineValue;

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <Field label="Code">{(f) => <Input {...fieldProps(f)} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="EXT-05" />}</Field>
      <Field label="Name">{(f) => <Input {...fieldProps(f)} value={name} onChange={(e) => setName(e.target.value)} placeholder="Extruder 5" />}</Field>
      <Field label="Kind">{(f) => (
        <Select {...fieldProps(f)} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Pick a kind</option>
          {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
        </Select>
      )}</Field>
      <Field label="Area">{(f) => (
        <Select {...fieldProps(f)} value={areaValue} onChange={(e) => setArea(e.target.value)}>
          {(plant?.areas ?? []).map((a) => <option key={a} value={a}>{a}</option>)}
        </Select>
      )}</Field>
      <Field label="Line">{(f) => (
        <Select {...fieldProps(f)} value={lineValue} onChange={(e) => setLine(e.target.value)}>
          {(plant?.lines ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
        </Select>
      )}</Field>
      <Button
        variant="primary"
        disabled={!ready || create.isPending}
        onClick={() => create.mutate(
          { plantId: PLANT_ID, code: code.trim(), name: name.trim(), kind: kind.trim(), area: areaValue, line: lineValue },
          {
            onSuccess: (m) => {
              toast.success(`${m.code} added`);
              onDone();
            },
          },
        )}
      >
        Create machine
      </Button>
    </div>
  );
}
