import type { Metadata } from "next";
import { ClientOnly } from "@/ui/templates/ClientOnly";
import { WallScreen } from "@/features/wall/WallScreen";

export const metadata: Metadata = { title: "Room display" };

export default function Page() {
  return <ClientOnly><WallScreen /></ClientOnly>;
}
