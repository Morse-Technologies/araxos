"use client";
import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A centred glass dialog that scales in from 96 %. `instant` for keyboard-opened, high-frequency surfaces (⌘K). */
export function Modal({ open, onOpenChange, title, children, className, labelHidden, instant }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode; className?: string; labelHidden?: boolean; instant?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={cn("fixed inset-0 z-40 bg-[var(--scrim)]", !instant && "transition-opacity duration-[var(--dur-2)] data-[ending-style]:opacity-0 data-[starting-style]:opacity-0")} />
        <Dialog.Popup
          className={cn(
            "glass glass-strong glass-float sq sq-lg fixed top-[14vh] left-1/2 z-50 w-[min(600px,calc(100vw-32px))] -translate-x-1/2 outline-none",
            !instant && "transition-[opacity,transform] duration-[var(--dur-2)] data-[ending-style]:scale-[0.96] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.96] data-[starting-style]:opacity-0",
            className,
          )}
        >
          <Dialog.Title className={labelHidden ? "sr-only" : "px-6 pt-5 text-section font-medium"}>{title}</Dialog.Title>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
