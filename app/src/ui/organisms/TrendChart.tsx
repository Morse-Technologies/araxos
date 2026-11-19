"use client";
import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import { reduced } from "@/lib/motion";
import { useTokens, type Tokens } from "@/lib/tokens";

export type Trend = { t: number[]; v: number[]; lo?: number[]; hi?: number[] };
type Props = { trend: Trend; unit: string; label: string; height?: number };

const AXIS_FONT = "12px var(--font-plex), system-ui, sans-serif";
const AXIS_SIZE = 40;
const DEFAULT_HEIGHT = 180;
const BAND_ALPHA = "33";

/** The interval drawn under the line: the spread matters as much as the middle (§24.18). */
function options({ t, p, width }: { t: Tokens; p: Props; width: number }): uPlot.Options {
  const axis = { stroke: t.muted, font: AXIS_FONT, grid: { stroke: t.grid, width: 1 }, ticks: { show: false }, size: AXIS_SIZE };
  const withBand = !!p.trend.lo && !!p.trend.hi;
  return {
    width, height: p.height ?? DEFAULT_HEIGHT, legend: { show: false }, cursor: { points: { size: 6 } },
    scales: { x: { time: true } },
    axes: [axis, { ...axis, values: (_u, v) => v.map((x) => `${Math.round(x)}`) }],
    series: [{}, { label: p.label, stroke: t.accent, width: 2 }, ...(withBand ? [{ stroke: "transparent" }, { stroke: "transparent" }] : [])],
    bands: withBand ? [{ series: [3, 2], fill: `${t.bar}${BAND_ALPHA}` }] : [],
  };
}

/** A KPI trend in a raised well, in the screen's one teal; revealed left to right once (masking). */
export function TrendChart(p: Props) {
  const box = useRef<HTMLDivElement>(null);
  const t = useTokens();
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const data = [p.trend.t, p.trend.v, ...(p.trend.lo && p.trend.hi ? [p.trend.lo, p.trend.hi] : [])] as uPlot.AlignedData;
    const plot = new uPlot(options({ t, p, width: el.clientWidth }), data, el);
    const resize = new ResizeObserver(() => plot.setSize({ width: el.clientWidth, height: p.height ?? DEFAULT_HEIGHT }));
    resize.observe(el);
    if (!reduced()) gsap.from(el, { clipPath: "inset(0 100% 0 0)", duration: 0.7, ease: "power3.out", clearProps: "clipPath" });
    return () => { resize.disconnect(); plot.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, p.trend, p.height]);
  return <div ref={box} role="img" aria-label={`${p.label} in ${p.unit}`} className="w-full rounded-control bg-raised px-1 pt-2" />;
}
