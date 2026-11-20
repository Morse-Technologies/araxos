"use client";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { Flip } from "gsap/Flip";
import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { DUR, SPRING, SPRING_PATH, reduced } from "@/lib/motion";

gsap.registerPlugin(Flip, CustomEase);
CustomEase.create(SPRING, SPRING_PATH);
export { gsap, Flip };

/** A screen's parts rise into place, staggered, once when it mounts. Reduced motion: a plain fade. */
export function useEnter(ref: RefObject<HTMLElement | null>, opts: { selector?: string; stagger?: number } = {}) {
  const { selector, stagger = 0.06 } = opts;
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = selector ? root.querySelectorAll(selector) : Array.from(root.children);
    if (!targets.length) return;
    const ctx = gsap.context(() => {
      if (reduced()) gsap.from(targets, { opacity: 0, duration: DUR.base, clearProps: "opacity" });
      else gsap.from(targets, { y: 12, opacity: 0, duration: 0.6, ease: SPRING, stagger, clearProps: "transform,opacity" });
    }, root);
    return () => ctx.revert();
  }, [ref, selector, stagger]);
}

// ---- Shared-element transitions (list → detail) ------------------------------------------------------------
let pending: { id: string; state: Flip.FlipState } | null = null;

/** Call on the source (a queue row, a history card) right before navigating. */
export function captureShared(id: string) {
  const el = document.querySelector(`[data-flip-id="${id}"]`);
  pending = el ? { id, state: Flip.getState(el) } : null;
}

/** The target element morphs from the captured source. Runs once per capture. */
export function useSharedTarget(ref: RefObject<HTMLElement | null>, id: string | undefined) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !id || pending?.id !== id) return;
    const { state } = pending;
    pending = null;
    if (reduced()) { gsap.from(el, { opacity: 0, duration: DUR.base }); return; }
    Flip.from(state, { targets: el, duration: DUR.flip, ease: SPRING, scale: true, absolute: true });
  }, [ref, id]);
}

// ---- Approve / reject ---------------------------------------------------------------------------------------
/** Approve slides the row right, reject slides it left; then it folds away. Resolves when done. */
export function slideAway(el: Element | null, direction: 1 | -1): Promise<void> {
  return new Promise((done) => {
    if (!el) return done();
    if (reduced()) { gsap.to(el, { opacity: 0, duration: DUR.base, onComplete: done }); return; }
    gsap.timeline({ onComplete: done })
      .to(el, { x: 72 * direction, opacity: 0, duration: 0.26, ease: "power3.in" })
      .to(el, { height: 0, paddingTop: 0, paddingBottom: 0, marginTop: 0, marginBottom: 0, duration: DUR.slow, ease: "power3.inOut" });
  });
}

/** The «Aplicado» stamp lands: 1.15 → 1 with back.out(2) in 200 ms. */
export function stamp(el: Element | null) {
  if (!el) return;
  if (reduced()) { gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: DUR.base }); return; }
  gsap.fromTo(el, { scale: 1.15, opacity: 0, rotate: -6 }, { scale: 1, opacity: 1, rotate: -4, duration: DUR.base, ease: "back.out(2)" });
}

/** Subtle parallax of the background under the glass (≤ 6 px), following the pointer. Off under reduced motion. */
export function useParallax(ref: RefObject<HTMLElement | null>, max = 6) {
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced() || !matchMedia("(hover: hover)").matches) return;
    const xTo = gsap.quickTo(el, "x", { duration: 1.2, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 1.2, ease: "power3.out" });
    const move = (e: PointerEvent) => { xTo((e.clientX / innerWidth - 0.5) * -2 * max); yTo((e.clientY / innerHeight - 0.5) * -2 * max); };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [ref, max]);
}

/** A highlight that glides to the active item (nav pill, segmented control). First placement is instant. */
export function useGlide(pill: RefObject<HTMLElement | null>, measure: () => { x: number; width: number } | null, deps: unknown[]) {
  const placed = useRef(false);
  useLayoutEffect(() => {
    const el = pill.current;
    const box = measure();
    if (!el || !box) return;
    if (!placed.current || reduced()) { gsap.set(el, { opacity: 1, ...box }); placed.current = true; return; }
    gsap.to(el, { opacity: 1, ...box, duration: 0.5, ease: SPRING, overwrite: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Words of a transcript appear one after another (30 ms apart), 4 px rise. */
export function revealWords(root: Element | null, selector = "[data-word]") {
  if (!root) return;
  const words = root.querySelectorAll(selector);
  if (reduced()) { gsap.from(words, { opacity: 0, duration: DUR.base }); return; }
  gsap.from(words, { opacity: 0, y: 4, duration: 0.16, ease: "power3.out", stagger: 0.03, clearProps: "transform,opacity" });
}
