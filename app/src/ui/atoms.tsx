"use client";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { ActionKind, NoteState } from "@/lib/api";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";

export const buttonStyles = cva(
  "sq sq-sm inline-flex shrink-0 items-center justify-center gap-2 font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform,opacity] duration-[var(--dur-2)] active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 [&_svg]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary shadow-[0_1px_2px_rgb(0_0_0/0.18),inset_0_1px_0_rgb(255_255_255/0.14)] hover:opacity-90",
        accent: "bg-accent text-on-accent hover:opacity-90",
        glass: "glass hover:brightness-[1.03]",
        ghost: "text-text hover:bg-[var(--pill-neutral-bg)]",
        danger: "text-negative hover:bg-[var(--pill-negative-bg)]",
      },
      size: { sm: "h-8 px-3 text-small", md: "h-10 px-4 text-body", lg: "h-12 px-5 text-section", icon: "size-9" },
    },
    defaultVariants: { variant: "glass", size: "md" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles> & { busy?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant, size, busy, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} className={cn(buttonStyles({ variant, size }), className)} disabled={disabled || busy} aria-busy={busy || undefined} {...rest}>
      {busy && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
});

export type Tone = "neutral" | "positive" | "negative" | "warning" | "accent";
const TONES: Record<Tone, string> = {
  neutral: "bg-[var(--pill-neutral-bg)] text-[var(--pill-neutral-ink)]",
  positive: "bg-[var(--pill-positive-bg)] text-[var(--pill-positive-ink)]",
  negative: "bg-[var(--pill-negative-bg)] text-[var(--pill-negative-ink)]",
  warning: "bg-[var(--pill-warning-bg)] text-[var(--pill-warning-ink)]",
  accent: "bg-accent-soft text-accent",
};

export function Pill({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-small font-medium whitespace-nowrap [&_svg]:size-3.5", TONES[tone], className)}>{children}</span>;
}

const STATE_TONE: Record<NoteState, Tone> = {
  recording: "negative", draft: "neutral", needs_answer: "warning", ready: "accent", awaiting_second: "warning", applied: "positive", rejected: "negative", failed: "negative",
};
export const StatePill = ({ state }: { state: NoteState }) => <Pill tone={STATE_TONE[state]}>{t.states[state]}</Pill>;

const BAND: Record<ActionKind, string> = { report: "bg-act-report", order: "bg-act-order", visit: "bg-act-visit", crm: "bg-act-crm" };
const BAND_TEXT: Record<ActionKind, string> = { report: "text-act-report", order: "text-act-order", visit: "text-act-visit", crm: "text-act-crm" };
export const bandBg = (k: ActionKind) => BAND[k];
export const bandText = (k: ActionKind) => BAND_TEXT[k];

/** The action family in its fixed colour: a dot and the word (never colour alone). */
export function Band({ kind, className }: { kind: ActionKind; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-small font-medium", BAND_TEXT[kind], className)}>
      <span aria-hidden className={cn("size-2 rounded-full", BAND[kind])} />
      {t.kinds[kind]}
    </span>
  );
}

export const Kbd = ({ children }: { children: ReactNode }) => <kbd className="kbd">{children}</kbd>;

export function Avatar({ initials, className }: { initials: string; className?: string }) {
  return <span aria-hidden className={cn("grid size-8 shrink-0 place-items-center rounded-full bg-[var(--pill-neutral-bg)] text-small font-medium text-text", className)}>{initials}</span>;
}

export function Switch({ checked, onCheckedChange, label, id }: { checked: boolean; onCheckedChange: (v: boolean) => void; label: string; id?: string }) {
  return (
    <BaseSwitch.Root
      id={id}
      aria-label={label}
      checked={checked}
      onCheckedChange={(v) => onCheckedChange(v)}
      className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-control p-0.5 transition-colors duration-[var(--dur-2)] data-[checked]:bg-accent"
    >
      <BaseSwitch.Thumb className="block size-6 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] transition-transform duration-[var(--dur-3)] ease-[var(--ease-spring)] data-[checked]:translate-x-5" />
    </BaseSwitch.Root>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("sq sq-sm animate-pulse bg-[var(--pill-neutral-bg)]", className)} />;
}

/** The Field mark: a squircle with a sound wave crossing a tick. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <rect width="32" height="32" rx="10" fill="var(--brand)" style={{ cornerShape: "squircle" } as React.CSSProperties} />
      <path d="M7 17h3l2-5 3 10 3-12 2.5 7H25" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
