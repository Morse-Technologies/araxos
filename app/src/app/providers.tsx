"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { MOCK_STORAGE_KEY, reloadFromStorage, setMockActor } from "@/lib/api";
import { SmoothScroll } from "@/lib/smooth";
import { TooltipProvider } from "@/ui/atoms";

/** Mock only: another window (a second terminal) wrote the shared demo world, so re-read it and refresh every view. */
function useCrossWindowSync(client: QueryClient) {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === MOCK_STORAGE_KEY) { reloadFromStorage(); void client.invalidateQueries(); } };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [client]);
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const as = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("as");
    if (as) setMockActor(as);
    // Stale-while-revalidate: cached data shows instantly and refreshes quietly on focus or after 30 s.
    return new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 }, mutations: { retry: 0 } } });
  });
  useCrossWindowSync(client);
  return (
    <QueryClientProvider client={client}>
      <SmoothScroll />
      <TooltipProvider delay={400}>{children}</TooltipProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "!rounded-card !border-border !bg-surface !text-text !shadow-[var(--shadow-float)] !font-sans !text-body",
            description: "!text-muted",
          },
        }}
      />
    </QueryClientProvider>
  );
}
