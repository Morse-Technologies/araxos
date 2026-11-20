const TZ = "Europe/Madrid";

/** 20-11 · 13:18 in Madrid time, the way the office reads it. */
export function when(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, day: "2-digit", month: "2-digit" }).format(d).replace("/", "-");
  return `${day} · ${time(iso)}`;
}

export const time = (iso: string) => new Intl.DateTimeFormat("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** 1.234,50 € (Spanish grouping and decimals). */
export const euros = (v: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", useGrouping: true }).format(v);

/** N.º 000482 */
export const noteNo = (n: number) => `N.º ${String(n).padStart(6, "0")}`;
export const noteShort = (n: number) => String(n).padStart(6, "0");

/** «3 registros en Odoo y 1 evento en Google Calendar» from the systems an approval will write to. */
export function writesSummary(actions: { system: string; model: string }[]): string {
  const bySystem = new Map<string, number>();
  for (const a of actions) bySystem.set(a.system, (bySystem.get(a.system) ?? 0) + 1);
  const parts = [...bySystem].map(([sys, n]) => `${n} ${noun(sys, n)} en ${sys}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} y ${parts.at(-1)}` : parts[0] ?? "";
}

function noun(system: string, n: number) {
  if (system === "Google Calendar") return n === 1 ? "evento" : "eventos";
  return n === 1 ? "registro" : "registros";
}
