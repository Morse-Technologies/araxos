/**
 * A superellipse rounded rectangle as an SVG path, for browsers without `corner-shape: squircle` (iOS Safari,
 * older Firefox). Each corner follows |x|^n + |y|^n = r^n with n = 4, sampled densely enough to look continuous.
 */
const EXPONENT = 4;
const STEPS = 10;

export function squirclePath(w: number, h: number, radius: number): string {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  if (r === 0) return `M0,0H${w}V${h}H0Z`;
  const corners: [number, number, number][] = [[w - r, r, -Math.PI / 2], [w - r, h - r, 0], [r, h - r, Math.PI / 2], [r, r, Math.PI]];
  const pts: string[] = [];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= STEPS; i++) {
      const a = start + (i / STEPS) * (Math.PI / 2);
      const x = cx + r * sgnPow(Math.cos(a));
      const y = cy + r * sgnPow(Math.sin(a));
      pts.push(`${round(x)},${round(y)}`);
    }
  }
  return `M${pts.join("L")}Z`;
}

const sgnPow = (v: number) => Math.sign(v) * Math.abs(v) ** (2 / EXPONENT);
const round = (v: number) => Math.round(v * 100) / 100;

/** `corner-shape: squircle` ships in Chromium 139+ and recent desktop Safari/Firefox; elsewhere we clip with a path. */
export const supportsCornerShape = () => typeof CSS !== "undefined" && CSS.supports("corner-shape", "squircle");
