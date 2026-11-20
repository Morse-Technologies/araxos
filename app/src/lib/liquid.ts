/**
 * Liquid Glass refraction (ADR-F29): an SVG filter per surface that blurs, bends the edges of the backdrop with
 * `feDisplacementMap` and lifts saturation. Used through `backdrop-filter: url(#id)`, which only Chromium renders,
 * so it is a progressive enhancement: everywhere else the same surface is plain frosted glass (CSS `glass*`).
 */
export type LiquidOptions = { radius: number; bezel?: number; scale?: number; blur?: number; saturate?: number };

/** The displacement map: neutral grey in the middle, red (x) and blue (y) ramps at the rim. */
export function displacementMap(w: number, h: number, o: Required<LiquidOptions>): string {
  const inner = Math.max(0, o.radius - o.bezel / 2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<defs><linearGradient id="x" x1="0" x2="1"><stop offset="0" stop-color="#f00"/><stop offset="1" stop-color="#000"/></linearGradient>` +
    `<linearGradient id="y" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00f"/><stop offset="1" stop-color="#000"/></linearGradient>` +
    `<filter id="b"><feGaussianBlur stdDeviation="${o.bezel / 3}"/></filter></defs>` +
    `<rect width="${w}" height="${h}" fill="#000"/><rect width="${w}" height="${h}" rx="${o.radius}" fill="url(#x)"/>` +
    `<rect width="${w}" height="${h}" rx="${o.radius}" fill="url(#y)" style="mix-blend-mode:screen"/>` +
    `<rect x="${o.bezel}" y="${o.bezel}" width="${Math.max(0, w - 2 * o.bezel)}" height="${Math.max(0, h - 2 * o.bezel)}" rx="${inner}" fill="#808080" filter="url(#b)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function withDefaults(o: LiquidOptions): Required<LiquidOptions> {
  return { bezel: 14, scale: -36, blur: 3, saturate: 1.7, ...o };
}

/** The <filter> markup for a surface of w × h pixels. */
export function filterMarkup(id: string, w: number, h: number, opts: LiquidOptions): string {
  const o = withDefaults(opts);
  return `<filter id="${id}" x="0" y="0" width="${w}" height="${h}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">` +
    `<feGaussianBlur in="SourceGraphic" stdDeviation="${o.blur}" result="blur"/>` +
    `<feImage href="${displacementMap(w, h, o)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>` +
    `<feDisplacementMap in="blur" in2="map" scale="${o.scale}" xChannelSelector="R" yChannelSelector="B" result="bent"/>` +
    `<feColorMatrix in="bent" type="saturate" values="${o.saturate}"/></filter>`;
}

/** Set before first paint by the layout script: Chromium renders SVG filters inside backdrop-filter. */
export const refractionOn = () => typeof document !== "undefined" && document.documentElement.dataset.refract === "on";
