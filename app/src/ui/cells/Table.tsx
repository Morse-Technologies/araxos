import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type Column<T> = { key: string; label: ReactNode; className?: string; cell: (row: T) => ReactNode };

/** The plain bordered table every list screen uses: a quiet header, ruled rows, an optional row action. */
export function DataTable<T>({ rows, columns, rowKey, onRow, selected, minWidth = 720, label }: {
  rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; onRow?: (r: T) => void; selected?: string | null; minWidth?: number; label: string;
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table aria-label={label} className="w-full text-left text-body" style={{ minWidth }}>
        <thead className="border-b border-rule text-small text-muted">
          <tr>{columns.map((c) => <th key={c.key} className={cn("px-4 py-2.5 font-medium", c.className)}>{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {rows.map((r) => {
            const k = rowKey(r);
            return (
              <tr
                key={k} tabIndex={onRow ? 0 : undefined} aria-selected={onRow ? selected === k : undefined}
                onClick={onRow ? () => onRow(r) : undefined}
                onKeyDown={onRow ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRow(r); } } : undefined}
                className={cn(onRow && "cursor-pointer transition-colors duration-[var(--dur-1)] hover:bg-raised focus-visible:bg-raised focus-visible:outline-none", selected === k && "bg-raised")}
              >
                {columns.map((c) => <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>{c.cell(r)}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
