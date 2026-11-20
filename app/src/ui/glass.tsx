"use client";
import { useEffect, useId, useRef, type ComponentPropsWithoutRef, type ElementType, type RefObject } from "react";
import { cn } from "@/lib/cn";
import { filterMarkup, refractionOn, type LiquidOptions } from "@/lib/liquid";
import { squirclePath, supportsCornerShape } from "@/lib/squircle";

const SVG_NS = "http://www.w3.org/2000/svg";

function defsRoot(): SVGSVGElement {
  let svg = document.getElementById("liquid-defs") as SVGSVGElement | null;
  if (!svg) {
    svg = document.createElementNS(SVG_NS, "svg");
    svg.id = "liquid-defs";
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
    document.body.appendChild(svg);
  }
  return svg;
}

/** Refraction for one surface: builds its SVG filter at its pixel size and points `backdrop-filter` at it (Chromium only). */
export function useLiquid(ref: RefObject<HTMLElement | null>, opts: LiquidOptions | undefined) {
  const id = `lg${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const key = opts ? JSON.stringify(opts) : "";
  useEffect(() => {
    const el = ref.current;
    if (!el || !key || !refractionOn()) return;
    const o = JSON.parse(key) as LiquidOptions;
    const holder = document.createElementNS(SVG_NS, "g");
    defsRoot().appendChild(holder);
    const build = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width < 2 || height < 2) return;
      holder.innerHTML = filterMarkup(id, Math.round(width), Math.round(height), o);
      el.style.setProperty("backdrop-filter", `url(#${id})`);
    };
    build();
    const ro = new ResizeObserver(build);
    ro.observe(el);
    return () => { ro.disconnect(); holder.remove(); el.style.removeProperty("backdrop-filter"); };
  }, [ref, id, key]);
}

/** iOS Safari and older browsers: clip an identity piece to a superellipse path so it keeps the squircle look. */
export function useSquircleClip(ref: RefObject<HTMLElement | null>, radius: number | undefined) {
  useEffect(() => {
    const el = ref.current;
    if (!el || radius === undefined || supportsCornerShape()) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      el.style.clipPath = `path("${squirclePath(width, height, radius)}")`;
    });
    ro.observe(el);
    return () => { ro.disconnect(); el.style.clipPath = ""; };
  }, [ref, radius]);
}

type GlassProps<T extends ElementType> = {
  as?: T;
  tone?: "default" | "strong" | "clear";
  float?: boolean;
  /** Bend the backdrop at the rim (Chromium). Keep to the few floating surfaces: nav, dock, record button, sheets. */
  refract?: LiquidOptions;
  /** Clip to an SVG squircle where `corner-shape` is missing (identity pieces only). */
  clip?: number;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

/** A Liquid Glass surface. Solid when the person (or the OS) asks for less transparency, or in sun mode. */
export function Glass<T extends ElementType = "div">({ as, tone = "default", float, refract, clip, className, ...rest }: GlassProps<T>) {
  const ref = useRef<HTMLElement>(null);
  useLiquid(ref, refract);
  useSquircleClip(ref, clip);
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      ref={ref}
      data-glass={tone}
      className={cn("glass", tone === "strong" && "glass-strong", tone === "clear" && "glass-clear", float && "glass-float", className)}
      {...rest}
    />
  );
}
