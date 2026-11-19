import type { Metadata } from "next";
import { InterviewScreen } from "@/features/studio/InterviewScreen";
import { ClientOnly } from "@/ui/templates/ClientOnly";

export const metadata: Metadata = { title: "Interview" };

export default function Page() {
  return <ClientOnly><InterviewScreen /></ClientOnly>;
}
