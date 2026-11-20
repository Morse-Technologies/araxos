"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { setMockActor, setMockLatency } from "@/lib/api";
import { SmoothScroll } from "@/lib/smooth";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search);
      const as = q.get("as");
      if (as) setMockActor(as);
      if (q.has("fast")) setMockLatency(0);
    }
    return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 }, mutations: { retry: 0 } } });
  });
  return (
    <QueryClientProvider client={client}>
      <SmoothScroll />
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={{ classNames: { toast: "!glass !glass-strong !sq !sq-md !border-0 !text-text !font-sans !text-body", description: "!text-muted", actionButton: "!bg-primary !text-on-primary !rounded-full" } }}
      />
    </QueryClientProvider>
  );
}
