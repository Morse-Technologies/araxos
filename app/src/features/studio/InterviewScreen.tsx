"use client";
import { ArrowLeft, Check, Mic, ShieldAlert, Square, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useInterviews } from "@/features/hooks";
import type { DraftStep } from "@/lib/api/types";
import { cn } from "@/lib/cn";
import { fmtTime } from "@/lib/format";
import { Button, Pill, buttonStyles } from "@/ui/atoms";
import { ErrorState, LoadingRows, PageHeader } from "@/ui/cells";
import { Canvas } from "@/ui/templates/ShellLayout";

const TICK_MS = 1000;
const INTERVIEW_DRAFT = "pr-pel-002";
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
type Verdict = "keep" | "safety" | "drop";

/**
 * E2: an engineer interviews an expert with consent. The transcript drafts steps with their timestamps; anything
 * that sounds like isolating energy is flagged as a possible safety step, which only people can turn into one.
 */
export function InterviewScreen() {
  const router = useRouter();
  const { data, isPending, isError, refetch } = useInterviews();
  const [recording, setRecording] = useState(true);
  const [extra, setExtra] = useState(0);
  const [verdict, setVerdict] = useState<Record<number, Verdict>>({});
  const [at, setAt] = useState<number | null>(null);
  useEffect(() => {
    if (!recording) return;
    const t = window.setInterval(() => setExtra((s) => s + 1), TICK_MS);
    return () => clearInterval(t);
  }, [recording]);
  if (isPending) return <Canvas><LoadingRows rows={8} /></Canvas>;
  if (isError || !data[0]) return <Canvas><ErrorState what="the interview" onRetry={() => refetch()} /></Canvas>;
  const iv = data[0];
  const decided = iv.draft.every((_, i) => verdict[i]);

  return (
    <Canvas>
      <Link href="/studio" className={cn(buttonStyles({ variant: "ghost", size: "sm" }), "mb-3")}><ArrowLeft />Studio</Link>
      <PageHeader
        title={`Interview with ${iv.expert}`}
        subline={`${iv.machineKind} · consent recorded at ${fmtTime(iv.consentAt)}. Audio and transcript stay on this plant's server.`}
        actions={recording
          ? <Button variant="outline" onClick={() => setRecording(false)}><Square />Stop recording</Button>
          : <Button variant="outline" onClick={() => setRecording(true)}><Mic />Resume</Button>}
      />
      <p className="mt-4 flex items-center gap-2 text-body" role="timer">
        {recording && <span className="size-2.5 animate-pulse rounded-full bg-negative" aria-hidden />}
        <span className="num">{clock(iv.seconds + extra)}</span><span className="text-muted">{recording ? "recording" : "paused"}</span>
      </p>
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section aria-label="Transcript" className="flex flex-col gap-1">
          <h2 className="mb-2 text-section font-medium">Transcript</h2>
          {iv.segments.map((s) => (
            <p key={s.at} className={cn("grid grid-cols-[52px_1fr] gap-3 rounded-control px-2 py-2 text-body", at === s.at && "bg-[var(--accent-soft)]")}>
              <span className="text-small text-muted num">{clock(s.at)}</span>
              <span><span className="font-medium">{s.speaker === "expert" ? iv.expert.split(" ")[0] : "Engineer"}:</span> {s.text}</span>
            </p>
          ))}
        </section>
        <section aria-label="Draft steps" className="flex flex-col gap-3">
          <h2 className="text-section font-medium">Draft steps</h2>
          <ol className="flex flex-col gap-2">
            {iv.draft.map((d, i) => <DraftRow key={d.title} d={d} n={i + 1} verdict={verdict[i]} onJump={() => setAt(d.at)} onVerdict={(x) => setVerdict((v) => ({ ...v, [i]: x }))} />)}
          </ol>
          <Button variant="primary" size="lg" disabled={!decided} onClick={() => { toast.success("Draft created", { description: "PROC-PEL-HOP-002 v1, from this interview. Edit it, then send it to review." }); router.push(`/studio?id=${INTERVIEW_DRAFT}`); }}>
            Create the draft
          </Button>
          {!decided && <p className="text-small text-muted">Decide on every suggestion first.</p>}
        </section>
      </div>
    </Canvas>
  );
}

function DraftRow({ d, n, verdict, onJump, onVerdict }: { d: DraftStep; n: number; verdict?: Verdict; onJump: () => void; onVerdict: (v: Verdict) => void }) {
  return (
    <li className={cn("flex flex-col gap-2 rounded-card border border-border p-3", d.safetyFlag && "bg-[var(--pill-negative-bg)]")}>
      <p className="flex items-start gap-2 text-body">
        <span className="w-5 text-small text-muted num">{n}</span>
        {d.safetyFlag && <ShieldAlert className="mt-0.5 size-4 flex-none text-[var(--pill-negative-ink)]" aria-label="Possible safety step" />}
        <span className="flex-1">{d.title}</span>
        <button type="button" onClick={onJump} className="text-small text-muted underline num">{clock(d.at)}</button>
      </p>
      {d.safetyFlag && <p className="ml-7 text-small text-[var(--pill-negative-ink)]">Sounds like isolating energy. If it is, it becomes a safety step with a lock, and the version needs an engineer and a safety approver to sign.</p>}
      <div className="ml-7 flex flex-wrap gap-2">
        {verdict ? <Pill tone={verdict === "drop" ? "neutral" : verdict === "safety" ? "warning" : "positive"}>{verdict === "drop" ? "Not a step" : verdict === "safety" ? "Safety step" : "Kept"}</Pill> : (
          <>
            {d.safetyFlag
              ? <Button size="sm" variant="outline" onClick={() => onVerdict("safety")}><ShieldAlert />Make it a safety step</Button>
              : <Button size="sm" variant="outline" onClick={() => onVerdict("keep")}><Check />Keep</Button>}
            <Button size="sm" variant="ghost" onClick={() => onVerdict("drop")}><X />Not a step</Button>
          </>
        )}
      </div>
    </li>
  );
}
