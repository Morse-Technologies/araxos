import type { Metadata } from "next";
import { ReviewScreen } from "@/features/review/ReviewScreen";
import { ClientOnly } from "@/ui/templates/ClientOnly";

export const metadata: Metadata = { title: "Review" };

export default function Page() {
  return <ClientOnly><ReviewScreen /></ClientOnly>;
}
