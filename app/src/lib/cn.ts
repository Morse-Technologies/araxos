import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge our type scale so `text-small` doesn't swallow `text-muted`.
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["small", "body", "section", "title", "display"] }] } },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
