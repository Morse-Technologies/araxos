import type { Metadata } from "next";
import { ClientOnly } from "@/ui/templates/ClientOnly";
import { HubScreen } from "@/features/hub/HubScreen";

export const metadata: Metadata = { title: "Group hub" };

export default function Page() {
  return <ClientOnly><HubScreen /></ClientOnly>;
}
