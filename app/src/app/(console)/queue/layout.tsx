import type { Metadata } from "next";
import { QueueList } from "@/features/queue/QueueList";

export const metadata: Metadata = { title: "Bandeja" };

export default function QueueLayout({ children }: LayoutProps<"/queue">) {
  return (
    <div className="grid grid-cols-[360px_minmax(0,1fr)] items-start gap-6">
      <div className="sticky top-24 flex h-[calc(100dvh-8rem)] flex-col"><QueueList /></div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
