import type { Metadata } from "next";
import { WorkScreen } from "@/features/work/WorkScreen";
import { ClientOnly } from "@/ui/templates/ClientOnly";

export const metadata: Metadata = { title: "My work" };

export default function Page() {
  return <ClientOnly><WorkScreen /></ClientOnly>;
}
