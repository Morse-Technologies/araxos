import type { Metadata } from "next";
import { ClientOnly } from "@/ui/templates/ClientOnly";
import { AnalyticsScreen } from "@/features/analytics/AnalyticsScreen";

export const metadata: Metadata = { title: "Analytics" };

export default function Page() {
  return <ClientOnly><AnalyticsScreen /></ClientOnly>;
}
