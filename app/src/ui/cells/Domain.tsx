import {
  Activity, BookOpen, Camera, ClipboardCheck, FileText, GitBranch, History, Lightbulb, ListChecks, Lock, Ruler, ShieldAlert, type LucideIcon,
} from "lucide-react";
import type { CaseStatus, Citation, Confidence, Severity, StepKind, VersionStatus } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { caseStatusLabel, confidenceLabel, severityLabel, versionStatusLabel } from "@/lib/labels";
import { Band, Pill, type Tone } from "@/ui/atoms";

const BAR_HEIGHTS = [4, 7, 10];
const BAR_PITCH = 4.4;
function Bars({ filled, className }: { filled: number; className?: string }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden className={cn("size-3.5 flex-none", className)}>
      {BAR_HEIGHTS.map((h, i) => <rect key={h} x={i * BAR_PITCH} y={12 - h} width="2.6" height={h} rx="0.8" fill="currentColor" opacity={i < filled ? 1 : 0.22} />)}
    </svg>
  );
}

const sev: Record<Severity, { bars: number; ink: string }> = {
  high: { bars: 3, ink: "text-[var(--pill-negative-ink)] dark:text-negative" },
  medium: { bars: 2, ink: "text-[var(--pill-warning-ink)]" },
  low: { bars: 1, ink: "text-muted" },
};
/** Urgency as three rising bars, the same glyph as Atlas and Viper (§23.7). Never a pill or a side stripe. */
export function SeverityGlyph({ severity, label = true }: { severity: Severity; label?: boolean }) {
  const x = sev[severity];
  return (
    <span className={cn("inline-flex flex-none items-center gap-1.5 text-small font-medium whitespace-nowrap", x.ink)}>
      <Bars filled={x.bars} />
      {label ? severityLabel[severity] : <span className="sr-only">{severityLabel[severity]}</span>}
    </span>
  );
}

const CONF_BARS: Record<Confidence, number> = { high: 3, medium: 2, low: 1 };
/** Engine confidence: three bars and words, never a bare percentage (§24.5). */
export function ConfidenceGlyph({ confidence }: { confidence: Confidence }) {
  return <span className="inline-flex items-center gap-1.5 text-small font-medium text-text"><Bars filled={CONF_BARS[confidence]} />{confidenceLabel[confidence]}</span>;
}

const caseTone: Record<CaseStatus, Tone> = { open: "neutral", in_progress: "accent", blocked: "warning", closed: "positive" };
export const CaseStatusPill = ({ status }: { status: CaseStatus }) => <Pill tone={caseTone[status]}>{caseStatusLabel[status]}</Pill>;

const versionTone: Record<VersionStatus, Tone> = { draft: "neutral", review: "warning", safety_review: "warning", approved: "positive", retired: "neutral" };
export const VersionPill = ({ status }: { status: VersionStatus }) => <Pill tone={versionTone[status]}>{versionStatusLabel[status]}</Pill>;

export const stepKindIcon: Record<StepKind, LucideIcon> = {
  instruction: FileText, measurement: Ruler, photo: Camera, checklist: ListChecks, decision: GitBranch, safety: ShieldAlert,
};

/** The safety label next to a procedure band: text and icon, never colour alone. */
export const SafetyTag = () => (
  <span className="inline-flex items-center gap-1 rounded-chip bg-[var(--pill-negative-bg)] px-1.5 py-0.5 text-small font-medium text-[var(--pill-negative-ink)]">
    <Lock className="size-3" strokeWidth={2} />Safety
  </span>
);

const citeIcon: Record<Citation["kind"], LucideIcon> = { case: History, viper: Activity, knowledge: Lightbulb, manual: BookOpen, procedure: ClipboardCheck };
/**
 * Fixed Code Rule (§23.4): a coloured band only for documents. An approved procedure is `procedure`; an Atlas
 * manual keeps Atlas's `manual`; earlier cases, Viper alerts and Saber are `muted` with their own icon.
 */
export function CitationChip({ cite, onClick }: { cite: Citation; onClick?: () => void }) {
  const Icon = citeIcon[cite.kind];
  const kind = cite.kind === "procedure" ? "procedure" : cite.kind === "manual" ? "manual" : "muted";
  const body = (
    <Band kind={kind} size="md">
      <span className="inline-flex items-center gap-1.5">{kind === "muted" && <Icon className="size-3.5" strokeWidth={1.8} />}{cite.label}</span>
    </Band>
  );
  return onClick ? <button type="button" onClick={onClick} className="max-w-full rounded-[4px] text-left">{body}</button> : body;
}

/* Step indicator for setup and multi-step forms. */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} aria-current={i === current ? "step" : undefined} className={cn("flex items-center gap-2 text-body", i <= current ? "text-text" : "text-muted")}>
          <span className={cn("grid size-6 place-items-center rounded-full text-small font-medium num transition-colors duration-[var(--dur-2)]",
            i < current ? "bg-accent text-on-accent" : i === current ? "bg-primary text-on-primary" : "bg-active text-muted")}>
            {i + 1}
          </span>
          {s}
        </li>
      ))}
    </ol>
  );
}
