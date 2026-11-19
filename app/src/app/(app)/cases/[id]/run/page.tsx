import type { Metadata } from "next";
import { RunScreen } from "@/features/run/RunScreen";
import { ClientOnly } from "@/ui/templates/ClientOnly";

export const metadata: Metadata = { title: "Run procedure" };

export default async function Page({ params }: PageProps<"/cases/[id]/run">) {
  const { id } = await params;
  return <ClientOnly><RunScreen id={id} /></ClientOnly>;
}
