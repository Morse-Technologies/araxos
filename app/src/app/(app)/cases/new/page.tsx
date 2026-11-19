import type { Metadata } from "next";
import { NewIncident } from "@/features/cases/NewIncident";
import { ClientOnly } from "@/ui/templates/ClientOnly";

export const metadata: Metadata = { title: "New incident" };

export default function Page() {
  return <ClientOnly><NewIncident /></ClientOnly>;
}
