import type { Metadata } from "next";
import { VerifyScreen } from "@/features/kiosk/VerifyScreen";
import { ClientOnly } from "@/ui/templates/ClientOnly";

export const metadata: Metadata = { title: "Verify a lock" };

export default function Page() {
  return <ClientOnly><VerifyScreen /></ClientOnly>;
}
