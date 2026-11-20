"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "stopped";
export type LevelSource = "mic" | "fallback";

const FRAME_MS = 50;
const MAX_LEVELS = 160;

/** Root-mean-square level of one analyser frame, 0..1, boosted so speech fills the bar. */
export function rms(samples: Float32Array): number {
  let sum = 0;
  for (const s of samples) sum += s * s;
  return Math.min(1, Math.sqrt(sum / Math.max(1, samples.length)) * 4);
}

/** A believable speech envelope when there is no microphone: syllables, pauses and a little noise. */
export function syntheticLevel(tMs: number): number {
  const syllable = Math.abs(Math.sin(tMs / 110)) * 0.6;
  const phrase = Math.sin(tMs / 1700) > -0.55 ? 1 : 0.12;
  return Math.min(1, (0.12 + syllable * phrase + Math.random() * 0.12) * phrase);
}

/**
 * Real microphone level through the Web Audio API (getUserMedia → AnalyserNode). Nothing is recorded or kept:
 * the prototype only reads the level for the waveform. Without permission or support it falls back to a
 * synthetic envelope and says so.
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [source, setSource] = useState<LevelSource>("mic");
  const [elapsed, setElapsed] = useState(0);
  const levels = useRef<number[]>([]);
  const cleanup = useRef<() => void>(() => {});

  const tick = useCallback((read: (tMs: number) => number) => {
    const started = performance.now();
    const id = window.setInterval(() => {
      const tMs = performance.now() - started;
      levels.current.push(read(tMs));
      if (levels.current.length > MAX_LEVELS) levels.current.shift();
      setElapsed(tMs / 1000);
    }, FRAME_MS);
    return () => window.clearInterval(id);
  }, []);

  const start = useCallback(async () => {
    levels.current = [];
    setElapsed(0);
    setState("recording");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("no media");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      const stop = tick(() => { analyser.getFloatTimeDomainData(buf); return rms(buf); });
      setSource("mic");
      cleanup.current = () => { stop(); stream.getTracks().forEach((tr) => tr.stop()); void ctx.close(); };
    } catch {
      setSource("fallback");
      cleanup.current = tick(syntheticLevel);
    }
  }, [tick]);

  const stop = useCallback(() => { cleanup.current(); cleanup.current = () => {}; setState("stopped"); }, []);
  const reset = useCallback(() => { cleanup.current(); cleanup.current = () => {}; levels.current = []; setElapsed(0); setState("idle"); }, []);
  useEffect(() => () => cleanup.current(), []);
  return { state, source, elapsed, levels, start, stop, reset };
}
