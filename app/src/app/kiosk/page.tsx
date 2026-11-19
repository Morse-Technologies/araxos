import type { Metadata } from "next";
import { KioskScreen } from "@/features/kiosk/KioskScreen";
import { ClientOnly } from "@/ui/templates/ClientOnly";

export const metadata: Metadata = { title: "Shared terminal" };

export default function Page() {
  return <ClientOnly><KioskScreen /></ClientOnly>;
}
