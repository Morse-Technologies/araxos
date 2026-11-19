import type { Metadata } from "next";
import { StudioScreen } from "@/features/studio/StudioScreen";
import { ClientOnly } from "@/ui/templates/ClientOnly";

export const metadata: Metadata = { title: "Studio" };

export default function Page() {
  return <ClientOnly><StudioScreen /></ClientOnly>;
}
