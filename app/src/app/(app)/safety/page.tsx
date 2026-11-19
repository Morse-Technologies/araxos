import type { Metadata } from "next";
import { SafetyScreen } from "@/features/safety/SafetyScreen";
import { ClientOnly } from "@/ui/templates/ClientOnly";

export const metadata: Metadata = { title: "Safety" };

export default function Page() {
  return <ClientOnly><SafetyScreen /></ClientOnly>;
}
