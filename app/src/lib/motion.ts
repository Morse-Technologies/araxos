/** True when the person asked the OS for less motion. Every JS animation checks this; CSS uses the media query. */
export const reduced = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Durations of ARAXOS-FIELD.md §7.6, in seconds for GSAP. */
export const DUR = { fast: 0.12, base: 0.2, slow: 0.32, flip: 0.55 } as const;

/** Staggers of §7.6: words 30 ms, cards 60 ms, rows 40 ms. */
export const STAGGER = { words: 0.03, cards: 0.06, rows: 0.04 } as const;

/** Spring-like ease without visible bounce (damping ≈ 0.8). Registered with CustomEase in `gsapIn.ts`. */
export const SPRING = "field-spring";
export const SPRING_PATH = "M0,0 C0.12,0.62 0.22,0.96 0.42,1.012 0.6,1.02 0.78,1 1,1";
