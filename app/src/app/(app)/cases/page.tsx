import type { Metadata } from "next";
import { CasesScreen } from "@/features/cases/CasesScreen";
import { ClientOnly } from "@/ui/templates/ClientOnly";

export const metadata: Metadata = { title: "Cases" };

export default function Page() {
  return <ClientOnly><CasesScreen /></ClientOnly>;
}
