import type { Metadata } from "next";
import { LaptopVerifyScreen } from "@/features/safety/LaptopVerifyScreen";
import { ClientOnly } from "@/ui/templates/ClientOnly";

export const metadata: Metadata = { title: "Verify a lock" };

export default function Page() {
  return <ClientOnly><LaptopVerifyScreen /></ClientOnly>;
}
