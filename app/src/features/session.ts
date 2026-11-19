"use client";
// Per-browser station settings: the density and contrast of this screen, and the kiosk session of a shared terminal.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { Density, Id } from "@/lib/api";

const EVENT = "araxos-station";
type Station = { density: Density; plant: boolean; terminalId: Id | null; kioskUser: Id | null };
const KEY = "araxos-station";
const DEFAULT: Station = { density: "office", plant: false, terminalId: null, kioskUser: null };

let cacheRaw: string | null | undefined;
let cache: Station = DEFAULT;
function read(): Station {
  let raw: string | null = null;
  try { raw = localStorage.getItem(KEY); } catch {}
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  try { cache = raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<Station>) } : DEFAULT; } catch { cache = DEFAULT; }
  return cache;
}
const subscribe = (cb: () => void) => { window.addEventListener(EVENT, cb); window.addEventListener("storage", cb); return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); }; };

export function setStation(change: Partial<Station>) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...change })); } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function useStation() {
  const station = useSyncExternalStore(subscribe, read, () => DEFAULT);
  const set = useCallback((c: Partial<Station>) => setStation(c), []);
  return { ...station, set };
}

/** Mirrors the station's density and contrast onto <html> (`data-density`, `data-contrast`); `force` wins for one screen. */
export function useApplyDensity(force?: Density) {
  const { density, plant } = useStation();
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.density = force ?? density;
    if (plant && !force) html.dataset.contrast = "plant"; else delete html.dataset.contrast;
    return () => { if (force) html.dataset.density = density; };
  }, [density, plant, force]);
}
