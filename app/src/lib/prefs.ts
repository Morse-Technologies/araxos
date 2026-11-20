"use client";
import { useCallback, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { reduced } from "@/lib/motion";

export type Theme = "light" | "dark";
export type ThemeChoice = Theme | "system";
const KEY = { theme: "field-theme", transparency: "field-transparency", sun: "field-sun" } as const;
const EVENT = "field-prefs";
const REVEAL_MS = 560;

const html = () => document.documentElement;
const save = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch {} };
const notify = () => window.dispatchEvent(new Event(EVENT));

const systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;
const readTheme = (): Theme => (html().dataset.theme === "dark" ? "dark" : "light");
/** `data-theme` always holds the resolved theme; `data-theme-auto` marks that it follows the system. */
const readChoice = (): ThemeChoice => (html().dataset.themeAuto ? "system" : readTheme());

function subscribe(cb: () => void) {
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const follow = () => { if (html().dataset.themeAuto) html().dataset.theme = systemDark() ? "dark" : "light"; cb(); };
  window.addEventListener(EVENT, cb);
  mq.addEventListener("change", follow);
  return () => { window.removeEventListener(EVENT, cb); mq.removeEventListener("change", follow); };
}

export function setTheme(choice: ThemeChoice) {
  if (choice === "system") { html().dataset.themeAuto = "1"; html().dataset.theme = systemDark() ? "dark" : "light"; }
  else { delete html().dataset.themeAuto; html().dataset.theme = choice; }
  save(KEY.theme, choice === "system" ? null : choice);
  notify();
}

/** Light or dark; the new theme is revealed as a circle growing from the click (view transitions, if any). */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  const choice = useSyncExternalStore(subscribe, readChoice, () => "system" as ThemeChoice);
  const toggle = useCallback((e?: { clientX: number; clientY: number }) => {
    const next: Theme = readTheme() === "dark" ? "light" : "dark";
    if (!document.startViewTransition || reduced()) return setTheme(next);
    const x = e?.clientX ?? innerWidth / 2;
    const y = e?.clientY ?? innerHeight / 2;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(() => flushSync(() => setTheme(next)));
    vt.ready.then(() => html().animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: REVEAL_MS, easing: "cubic-bezier(0.77, 0, 0.175, 1)", pseudoElement: "::view-transition-new(root)" },
    ));
  }, []);
  return { theme, choice, toggle, setTheme };
}

/** «Reduce transparency» (our own switch; the OS preference is honoured in CSS too) and sun mode. */
function useFlag(attr: "transparency" | "sun", on: string) {
  const read = () => html().dataset[attr] === on;
  const value = useSyncExternalStore(subscribe, read, () => false);
  const set = useCallback((v: boolean) => {
    if (v) html().dataset[attr] = on; else delete html().dataset[attr];
    save(KEY[attr], v ? on : null);
    notify();
  }, [attr, on]);
  return [value, set] as const;
}

export const useReducedTransparency = () => useFlag("transparency", "reduced");
export const useSunMode = () => useFlag("sun", "on");

/** Inline script for <head>: applies saved prefs and detects refraction support before first paint (no flash). */
export const PREFS_SCRIPT = `try{var d=document.documentElement,l=localStorage;var t=l.getItem("${KEY.theme}");if(t==="dark"||t==="light")d.dataset.theme=t;else{d.dataset.themeAuto="1";d.dataset.theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}if(l.getItem("${KEY.transparency}"))d.dataset.transparency="reduced";if(l.getItem("${KEY.sun}"))d.dataset.sun="on";var b=navigator.userAgentData&&navigator.userAgentData.brands;if(b&&b.some(function(x){return x.brand==="Chromium"}))d.dataset.refract="on"}catch(e){}`;
