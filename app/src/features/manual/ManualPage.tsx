"use client";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import { cn } from "@/lib/cn";
import { Button, buttonStyles } from "@/ui/atoms";
import { LoadingRows } from "@/ui/cells";

// pdf.js parses in a worker bundled from pdfjs-dist (Apache-2.0), so nothing is fetched from a CDN.
pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * One page of a manual, rendered by pdf.js with its text layer, the cited passage highlighted. The person can page
 * around it or open the whole PDF; the highlight only shows on the cited page.
 */
export default function ManualPage({ url, page, quote, onFail }: { url: string; page: number; quote: string; onFail: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [pages, setPages] = useState(0);
  const [at, setAt] = useState(page);
  const [shownFor, setShownFor] = useState(page);
  if (shownFor !== page) { setShownFor(page); setAt(page); }

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(Math.floor(el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const render = useCallback(({ str }: { str: string }) => {
    const safe = escapeHtml(str);
    if (at !== page || !quote || !str.includes(quote)) return safe;
    return safe.replace(escapeHtml(quote), `<mark class="manual-cite">${escapeHtml(quote)}</mark>`);
  }, [at, page, quote]);

  return (
    <div className="flex flex-col gap-2">
      <div ref={box} className="manual-page overflow-hidden rounded-control border border-rule bg-white" aria-label={`Page ${at} of the manual`}>
        <Document file={url} onLoadSuccess={(d) => setPages(d.numPages)} onLoadError={onFail} loading={<LoadingRows rows={6} pitch="h-4" className="p-3" />} error={null}>
          {width > 0 && <Page pageNumber={at} width={width} renderAnnotationLayer={false} customTextRenderer={render} loading={<div className="aspect-[1/1.414] bg-raised" />} onRenderError={onFail} />}
        </Document>
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" aria-label="Previous page" disabled={at <= 1} onClick={() => setAt((p) => Math.max(1, p - 1))}><ChevronLeft /></Button>
        <span className="num text-small text-muted">p. {at}{pages ? ` of ${pages}` : ""}</span>
        <Button size="icon" variant="ghost" aria-label="Next page" disabled={!!pages && at >= pages} onClick={() => setAt((p) => p + 1)}><ChevronRight /></Button>
        {at !== page && <Button size="sm" variant="ghost" onClick={() => setAt(page)}>Back to p. {page}</Button>}
        <a href={`${url}#page=${at}`} target="_blank" rel="noreferrer" className={cn(buttonStyles({ variant: "ghost", size: "sm" }), "ml-auto")}><ExternalLink />Open PDF</a>
      </div>
    </div>
  );
}
