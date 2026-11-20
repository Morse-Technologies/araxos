"use client";
import Lenis from "lenis";
import { useEffect } from "react";
import { gsap } from "@/lib/gsapIn";
import { reduced } from "@/lib/motion";

/** Smooth window scrolling, driven by GSAP's ticker so every motion shares one clock. Off under reduced motion. */
export function SmoothScroll() {
  useEffect(() => {
    if (reduced()) return;
    const lenis = new Lenis({ autoRaf: false, lerp: 0.12, wheelMultiplier: 0.95, allowNestedScroll: true });
    const tick = (t: number) => lenis.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(tick); lenis.destroy(); };
  }, []);
  return null;
}
