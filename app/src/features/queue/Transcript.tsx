"use client";
import { useLayoutEffect, useRef } from "react";
import type { Entity, Note } from "@/lib/api";
import { cn } from "@/lib/cn";
import { revealWords } from "@/lib/gsapIn";
import { t } from "@/lib/i18n";
import { ENTITY_ICON, confidenceLevel, segments } from "./entityIcons";

export type Highlight = { entityId?: string; words?: [number, number] };

const inRange = (i: number, r?: [number, number]) => !!r && i >= r[0] && i <= r[1];

/**
 * The transcript with its entities: a typed underline (solid, softer, or dotted on amber by confidence) and a
 * glyph. Hovering an entity lights the fields it fed; hovering a field lights the words it came from.
 */
export function Transcript({ note, highlight, onHover, onPick, picked, animate = true, size = "md" }: {
  note: Note; highlight: Highlight; onHover: (h: Highlight) => void; onPick: (e: Entity) => void; picked?: string; animate?: boolean; size?: "md" | "lg";
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = note.transcript.words;
  useLayoutEffect(() => { if (animate) revealWords(ref.current); }, [animate, note.id]);
  const word = (i: number) => (
    <span key={i} data-word className={cn("word", words[i].p < 0.7 && "text-muted")} data-active={inRange(i, highlight.words) || undefined} lang={words[i].lang}>
      {words[i].text}{" "}
    </span>
  );
  return (
    <p ref={ref} className={cn("leading-[1.9]", size === "lg" ? "text-section" : "text-body")} data-testid="transcript">
      {segments(words.length, note.entities).map((s) => {
        if (s.kind === "words") return Array.from({ length: s.to - s.from + 1 }, (_, k) => word(s.from + k));
        const e = s.entity;
        const Icon = ENTITY_ICON[e.type];
        const level = confidenceLevel(e.confidence);
        const active = highlight.entityId === e.id || picked === e.id || inRange(e.from, highlight.words);
        return (
          <span key={e.id} data-word className="inline">
            <button
              type="button"
              className="ent px-0.5 text-left"
              data-conf={level}
              data-active={active || undefined}
              data-entity={e.id}
              onMouseEnter={() => onHover({ entityId: e.id })}
              onMouseLeave={() => onHover({})}
              onFocus={() => onHover({ entityId: e.id })}
              onBlur={() => onHover({})}
              onClick={() => onPick(e)}
              aria-label={`${t.entities[e.type]}: ${e.value} (${t.detail.confidence[level]})`}
            >
              <Icon aria-hidden className="mr-0.5 mb-0.5 inline size-3.5 align-middle opacity-70" />
              {level === "medium" && <span aria-hidden className="mr-0.5 inline-block size-1.5 rounded-full bg-current align-middle opacity-60" />}
              {words.slice(e.from, e.to + 1).map((w) => w.text).join(" ")}
            </button>{" "}
          </span>
        );
      })}
    </p>
  );
}
