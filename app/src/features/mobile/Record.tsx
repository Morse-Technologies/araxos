"use client";
import { Check, Mic, MicOff, Square, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, SCENARIOS, type Note, type ScenarioId } from "@/lib/api";
import { cn } from "@/lib/cn";
import { gsap } from "@/lib/gsapIn";
import { t } from "@/lib/i18n";
import { reduced } from "@/lib/motion";
import { Button } from "@/ui/atoms";
import { Glass } from "@/ui/glass";
import { ENTITY_ICON } from "@/features/queue/entityIcons";
import { useRecorder } from "./useRecorder";
import { Waveform } from "./Waveform";

const PREVIEW_META = { id: "preview", number: 0, recordedAt: new Date(0).toISOString() };
const UNDERSTAND_MS = 1800;

/** The scripted words heard so far, with each entity underlined once all its words have arrived. */
function LiveTranscript({ note, heard }: { note: Note; heard: number }) {
  const box = useRef<HTMLParagraphElement>(null);
  const last = useRef(0);
  useEffect(() => {
    const words = box.current?.querySelectorAll("[data-w]");
    if (!words || heard <= last.current || reduced()) { last.current = heard; return; }
    gsap.from(Array.from(words).slice(last.current, heard), { opacity: 0, y: 4, duration: 0.16, ease: "power3.out", stagger: 0.03 });
    last.current = heard;
    box.current?.parentElement?.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" });
  }, [heard]);
  const entityAt = (i: number) => note.entities.find((e) => i >= e.from && i <= e.to && e.to < heard);
  return (
    <p ref={box} className="text-[19px] leading-[1.75]" aria-live="polite" data-testid="live-transcript">
      {note.transcript.words.slice(0, heard).map((w, i) => {
        const e = entityAt(i);
        const Icon = e && i === e.from ? ENTITY_ICON[e.type] : null;
        return (
          <span key={i} data-w className={cn(e && "ent", i === heard - 1 && "word")} data-active={i === heard - 1 || undefined} data-conf={e ? (e.confidence >= 0.85 ? "high" : e.confidence >= 0.65 ? "medium" : "low") : undefined}>
            {Icon && <Icon aria-hidden className="mr-0.5 mb-1 inline size-4 opacity-70" />}{w.text}{" "}
          </span>
        );
      })}
    </p>
  );
}

function ScenarioPicker({ value, onChange, disabled }: { value: ScenarioId; onChange: (s: ScenarioId) => void; disabled: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-small text-muted">{t.mobile.scenario}</span>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as ScenarioId)} data-testid="scenario"
        className="glass glass-clear sq sq-sm h-11 w-full px-3 text-body font-medium outline-none">
        {(Object.keys(SCENARIOS) as ScenarioId[]).map((k) => <option key={k} value={k}>{SCENARIOS[k].label}</option>)}
      </select>
    </label>
  );
}

export function RecordScreen() {
  const router = useRouter();
  const [scenario, setScenario] = useState<ScenarioId>("javier-cantabrico");
  const [step, setStep] = useState(-1);
  const rec = useRecorder();
  const script = useMemo(() => SCENARIOS[scenario].build(PREVIEW_META), [scenario]);
  const words = script.transcript.words;
  const heard = rec.state === "idle" ? 0 : words.filter((w) => w.t <= rec.elapsed).length;
  const finished = heard === words.length && rec.elapsed > words[words.length - 1].t + 1.2;

  const finish = async () => {
    rec.stop();
    setStep(0);
    const timers = t.mobile.understandingSteps.map((_, i) => window.setTimeout(() => setStep(i), (i * UNDERSTAND_MS) / 3));
    const [note] = await Promise.all([api.createNote({ scenario, durationSec: Math.round(rec.elapsed) }), new Promise((r) => setTimeout(r, UNDERSTAND_MS))]);
    timers.forEach(clearTimeout);
    router.push(`/m/review/${note.id}`);
  };

  // The scripted note has been "said": finish on the next tick (a timer, so state changes happen in a callback).
  useEffect(() => {
    if (!finished || rec.state !== "recording") return;
    const id = window.setTimeout(() => void finish(), 0);
    return () => window.clearTimeout(id);
  });

  const recording = rec.state === "recording";
  return (
    <div className="flex min-h-full flex-col px-5 pt-14 pb-8">
      <header className="mb-4 flex items-center gap-2">
        <Link href="/m" aria-label={t.mobile.cancel} className="glass glass-clear grid size-10 place-items-center rounded-full"><X className="size-5" /></Link>
        <h1 className="text-section font-semibold">{t.mobile.record}</h1>
        <span className="ml-auto font-mono text-section tabular" aria-label="Tiempo">{t.common.seconds(Math.floor(rec.elapsed))}</span>
      </header>
      <ScenarioPicker value={scenario} onChange={setScenario} disabled={rec.state !== "idle"} />
      <Glass tone="strong" className="sq sq-xl scroll-soft mt-4 min-h-[260px] flex-1 overflow-y-auto p-5">
        {rec.state === "idle" && <p className="text-muted">{t.mobile.recordHint}. {SCENARIOS[scenario].lang} · detección automática (castellano, gallego, catalán).</p>}
        {rec.state !== "idle" && step < 0 && <LiveTranscript note={script} heard={heard} />}
        {step >= 0 && (
          <div className="space-y-3" role="status" data-testid="understanding">
            <p className="text-section font-semibold">{t.mobile.understanding}</p>
            {t.mobile.understandingSteps.map((s, i) => (
              <p key={s} className={cn("flex items-center gap-2 transition-opacity", i > step && "opacity-40")}><Check className={cn("size-4", i < step ? "text-positive" : "text-muted")} />{s}</p>
            ))}
          </div>
        )}
      </Glass>
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-center gap-1.5 text-small text-muted" data-testid="mic-source">
          {rec.state === "idle" ? <><Mic className="size-3.5" />{t.mobile.micAsk}</> : rec.source === "mic" ? <><Mic className="size-3.5" />{t.mobile.micReal}</> : <><MicOff className="size-3.5" />{t.mobile.micFallback}</>}
        </div>
        <Waveform levels={rec.levels} active={recording} className="h-16 w-full text-text" />
        <div className="mt-5 flex items-center justify-center">
          {rec.state === "idle" ? (
            <Glass as="button" type="button" onClick={() => void rec.start()} refract={{ radius: 48, bezel: 14, scale: -30 }} float aria-label={t.mobile.start} data-testid="record"
              className="grid size-24 place-items-center rounded-full">
              <span className="grid size-[72px] place-items-center rounded-full bg-rec text-white shadow-[0_10px_30px_-8px_var(--rec)]"><Mic className="size-8" /></span>
            </Glass>
          ) : (
            <Button variant="primary" size="lg" className="h-14 rounded-full px-8" onClick={() => void finish()} disabled={!recording} data-testid="stop">
              <Square className="fill-current" />{t.mobile.stop}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
