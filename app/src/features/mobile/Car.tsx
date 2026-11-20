"use client";
import { Check, Mic, Square, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, type Note } from "@/lib/api";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { useRecorder } from "./useRecorder";
import { Waveform } from "./Waveform";

/** Car mode: solid, huge targets, no glass, one decision at a time; Field reads the plan back (§7.5). */
export function CarScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const rec = useRecorder();
  const [note, setNote] = useState<Note | null>(null);
  const [sent, setSent] = useState(false);
  const recording = rec.state === "recording";
  const toggle = async () => {
    if (!recording) { setSent(false); setNote(null); return void rec.start(); }
    rec.stop();
    setNote(await api.createNote({ scenario: "talleres-perez", durationSec: Math.round(rec.elapsed) }));
  };
  const confirm = async () => { if (!note) return; await api.submit(note.id); void qc.invalidateQueries(); setSent(true); setNote(null); rec.reset(); };
  return (
    <div className="flex min-h-full flex-col bg-[#07090c] px-6 pt-14 pb-10 text-white" data-testid="car">
      <header className="flex items-center">
        <h1 className="text-title font-semibold">{t.mobile.car.title}</h1>
        <Link href="/m" aria-label={t.mobile.car.exit} className="ml-auto grid size-12 place-items-center rounded-full bg-white/10"><X className="size-6" /></Link>
      </header>
      {note ? (
        <div className="mt-8 flex flex-1 flex-col">
          <p className="text-small text-white/70">{t.mobile.car.readBack}</p>
          <p className="mt-3 text-[26px] leading-snug font-semibold">{note.customer}: {note.actions.map((a) => a.title.toLowerCase()).join(", ")}.</p>
          <div className="mt-auto grid grid-cols-2 gap-3">
            <button type="button" onClick={() => router.push(`/m/review/${note.id}`)} className="h-24 rounded-[28px] bg-white/12 text-[22px] font-semibold">No</button>
            <button type="button" onClick={() => void confirm()} className="flex h-24 items-center justify-center gap-2 rounded-[28px] bg-[#4cc488] text-[22px] font-semibold text-black" data-testid="car-yes"><Check className="size-7" />Sí</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-8">
          {sent && <p className="flex items-center gap-2 text-section font-semibold text-[#4cc488]" role="status"><Check className="size-5" />{t.mobile.car.sent}</p>}
          <button type="button" onClick={() => void toggle()} data-testid="car-record" aria-label={recording ? t.mobile.car.recording : t.mobile.car.ready}
            className={cn("grid size-56 place-items-center rounded-full text-white transition-transform active:scale-95", recording ? "bg-[#ef6b6f]" : "bg-[#c4242a]")}>
            {recording ? <Square className="size-16 fill-current" /> : <Mic className="size-20" />}
          </button>
          <p className="text-section font-medium text-white/85">{recording ? t.mobile.car.recording : t.mobile.car.ready}</p>
          <Waveform levels={rec.levels} active={recording} className="h-14 w-full text-white/80" />
        </div>
      )}
    </div>
  );
}
