import { cn } from "@/lib/cn";

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");

/** A person's initials on a neutral disc: identity, never a colour that could read as data. `hue` is accepted and ignored. */
export function Avatar({ name, size = 24, className }: { name: string; hue?: number; size?: 20 | 24 | 32; className?: string }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-full font-medium",
        "bg-active text-text",
        size === 32 ? "text-body" : "text-[11px]",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/** The Araxos mark, the exact geometry of the website's araxos-icon.svg, filled with the --brand token (Morse maroon, lifted in dark). */
export const MARK_PATH = "M1103.342 2593.822 L1365.378 2097.905 L1908.46 2593.822 L2701.379 2593.822 L1869.593 1731.942 L2648.518 406.178 L1912.526 406.178 L1619.756 872.508 L1180.6 406.178 L371.416 406.178 L1103.342 1254.736 L322.621 2593.822 Z";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 3024 3000" aria-hidden className={cn("size-7", className)}>
      <path className="fill-brand" d={MARK_PATH} />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block rounded-[4px] bg-active", className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cn("size-4 animate-spin text-muted [animation-duration:900ms]", className)}>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
