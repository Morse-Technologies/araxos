<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Araxos Field app

- Prototype: frontend only, on a typed mock API (`src/lib/api`). `FieldApi` mirrors the operations of the
  OpenAPI in ARAXOS-FIELD.md §11; change the spec first, then the type, then the mock.
- UI text is Castilian Spanish and lives in `src/lib/i18n/es.ts`; components read `t.*` and never inline copy.
  Demo data is Spain-wide; Galician and Catalan are extra voice languages, not the focus.
- Glass and squircles are Tailwind utilities in `src/app/globals.css` (`glass*`, `sq*`). Refraction is the
  `Glass` component (`refract` prop) and only turns on in Chromium; everything must read with
  `data-transparency="reduced"`, `data-sun="on"` and `prefers-contrast: more`.
- Motion follows `MOTION.md`: GSAP only, check `reduced()`, use `DUR`, `STAGGER` and `SPRING`.
- Before a commit: `pnpm typecheck && pnpm lint && pnpm test && pnpm e2e`.
