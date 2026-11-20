import type { Lang, Word } from "../types";

const WORDS_PER_SECOND = 2.6;

/** Turns spoken segments into timed words (`transcript.v1`). Confidence dips on words listed in `unsure`. */
export function speak(segments: { lang: Lang; text: string }[], unsure: string[] = []): Word[] {
  const words: Word[] = [];
  let t = 0.4;
  for (const seg of segments) {
    for (const text of seg.text.split(/\s+/).filter(Boolean)) {
      const bare = text.replace(/[.,:;!?…«»]/g, "").toLowerCase();
      words.push({ t: Math.round(t * 100) / 100, text, p: unsure.includes(bare) ? 0.58 : 0.94, lang: seg.lang });
      t += 1 / WORDS_PER_SECOND + (/[.,…]$/.test(text) ? 0.25 : 0);
    }
  }
  return words;
}

/** Index range [from, to] of the first occurrence of `phrase` in the words, ignoring punctuation and case. */
export function span(words: Word[], phrase: string): [number, number] {
  const norm = (s: string) => s.replace(/[.,:;!?…«»]/g, "").toLowerCase();
  const target = phrase.split(/\s+/).map(norm);
  for (let i = 0; i + target.length <= words.length; i++) {
    if (target.every((w, k) => norm(words[i + k].text) === w)) return [i, i + target.length - 1];
  }
  throw new Error(`Phrase not in transcript: ${phrase}`);
}

/** Seconds of speech in a transcript, rounded up. */
export const spokenSeconds = (words: Word[]) => Math.ceil((words.at(-1)?.t ?? 0) + 1);
