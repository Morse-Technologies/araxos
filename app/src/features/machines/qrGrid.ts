const MODULES = 21;
const FINDER = 7;

/** Deterministic bit grid from a payload string — enough to look like a QR for a print label. */
export function qrModules(payload: string): boolean[][] {
  const seed = hash(payload);
  const grid = Array.from({ length: MODULES }, () => Array.from({ length: MODULES }, () => false));
  for (let y = 0; y < MODULES; y += 1) {
    for (let x = 0; x < MODULES; x += 1) {
      grid[y][x] = bitAt(seed, x, y);
    }
  }
  stampFinder(grid, 0, 0);
  stampFinder(grid, MODULES - FINDER, 0);
  stampFinder(grid, 0, MODULES - FINDER);
  return grid;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function bitAt(seed: number, x: number, y: number): boolean {
  const n = Math.imul(seed ^ (x * 374761393), y * 668265263) >>> 0;
  return (n & 1) === 1;
}

function stampFinder(grid: boolean[][], ox: number, oy: number) {
  for (let y = 0; y < FINDER; y += 1) {
    for (let x = 0; x < FINDER; x += 1) {
      const edge = x === 0 || y === 0 || x === FINDER - 1 || y === FINDER - 1;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      grid[oy + y][ox + x] = edge || core;
    }
  }
}
