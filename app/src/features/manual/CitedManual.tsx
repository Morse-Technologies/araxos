"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { Cite } from "@/lib/api/types";
import { manualUrl } from "@/lib/manuals";
import { Band } from "@/ui/atoms";
import { LoadingRows } from "@/ui/cells";

// pdf.js needs the browser (canvas, workers), so the viewer never renders on the server.
const ManualPage = dynamic(() => import("./ManualPage"), { ssr: false, loading: () => <LoadingRows rows={6} pitch="h-4" /> });



/** The page a step cites, from the real PDF when the plant has it; otherwise the cited passage on its own. */
export function CitedManual({ cite }: { cite: Cite }) {
  const url = manualUrl(cite.doc);
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const failed = failedFor === url;
  return (
    <figure className="rounded-card border border-border">
      <div className="border-b border-rule px-3 py-2"><Band kind="manual" size="xs">{cite.doc} · p. {cite.page}</Band></div>
      <div className="flex flex-col gap-2 p-3">
        {url && !failed ? <ManualPage url={url} page={cite.page} quote={cite.quote} onFail={() => setFailedFor(url)} /> : (
          <div className="rounded-control bg-raised p-4 text-small text-muted" aria-label={`Page ${cite.page} passage`}>
            <p className="rounded bg-[var(--accent-soft)] px-2 py-1 text-text">{cite.quote}</p>
            <p className="mt-2">{failed ? "The PDF could not be opened on this device; this is the cited passage." : "This manual is not on the plant server yet; this is the cited passage."}</p>
          </div>
        )}
        <figcaption className="text-small text-muted">“{cite.quote}” is the passage the step cites.</figcaption>
      </div>
    </figure>
  );
}
