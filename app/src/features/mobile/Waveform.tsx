"use client";
import { useEffect, useRef, type RefObject } from "react";

const BAR = 3;
const GAP = 3;

/** Centre-aligned bars, newest on the right; drawn on a canvas from the recorder's level buffer. */
export function Waveform({ levels, active, className }: { levels: RefObject<number[]>; active: boolean; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    let raf = 0;
    const draw = () => {
      const dpr = devicePixelRatio || 1;
      const { width, height } = c.getBoundingClientRect();
      if (c.width !== Math.round(width * dpr)) { c.width = Math.round(width * dpr); c.height = Math.round(height * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const color = getComputedStyle(c).color;
      const n = Math.floor(width / (BAR + GAP));
      const data = levels.current.slice(-n);
      ctx.fillStyle = color;
      data.forEach((v, i) => {
        const h = Math.max(3, v * (height - 4));
        const x = width - (data.length - i) * (BAR + GAP);
        ctx.beginPath();
        ctx.roundRect(x, (height - h) / 2, BAR, h, 1.5);
        ctx.fill();
      });
      if (active) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [levels, active]);
  return <canvas ref={canvas} aria-hidden className={className} />;
}
