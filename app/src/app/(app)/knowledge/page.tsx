import type { Metadata } from "next";
import { ClientOnly } from "@/ui/templates/ClientOnly";
import { KnowledgeScreen } from "@/features/knowledge/KnowledgeScreen";

export const metadata: Metadata = { title: "Saber" };

export default function Page() {
  return <ClientOnly><KnowledgeScreen /></ClientOnly>;
}
