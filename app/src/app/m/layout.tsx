import type { Metadata } from "next";
import { PhoneShell } from "@/features/mobile/PhoneShell";

export const metadata: Metadata = { title: "App móvil" };
export default function MobileLayout({ children }: LayoutProps<"/m">) {
  return <PhoneShell>{children}</PhoneShell>;
}
