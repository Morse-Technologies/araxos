/** A seeded generator (mulberry32) so every mock series, spectrum and frame is the same on every load. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable numeric seed from an id. */
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A 16-hex digest from two FNV passes: enough to look and behave like a hash chain in the mock. */
export const digest = (s: string) => hash(s).toString(16).padStart(8, "0") + hash(`${s}#`).toString(16).padStart(8, "0");

/** A 64-hex stand-in for sha256 (four digests). The real client hashes with Web Crypto (ADR-A29). */
export const sha256 = (s: string) => [0, 1, 2, 3].map((i) => digest(`${i}:${s}`)).join("");
