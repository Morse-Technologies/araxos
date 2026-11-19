/** Manuals bundled with the demo. Each is a fictitious sample (scripts/sample-manual.py); a plant serves its own from the server. */
export const MANUAL_FILES: Record<string, string> = {
  "Reducer R-200 manual": "/manuals/reducer-r-200.pdf",
};

export const manualUrl = (doc: string): string | null => MANUAL_FILES[doc] ?? null;
