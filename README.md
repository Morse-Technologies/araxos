# Araxos

Guided maintenance for industrial plants by Morse Technologies: from an incident to a closed case with an
approved procedure, evidence and a double-checked lockout, running on the plant's own server.

This repository holds the **web and desktop frontend** (`app/`): the supervisor, planner, engineering, safety,
audit and administration screens, the shared-terminal kiosk, and desktop equivalents of the technician's mobile
flows. The native mobile app (Kotlin Multiplatform) is not here. It currently runs on a typed mock layer with a
fictitious group (Ferrovela, three plants; Araxos runs in North Plant); there is no backend yet.

## Run it

```bash
cd app
pnpm install
pnpm dev            # http://localhost:3000 (any email, any password, any 6-digit code except 000000)
```

| Command | What it does |
|---|---|
| `pnpm build` | Production build (`output: standalone`) |
| `pnpm lint` | ESLint (Next core web vitals + TypeScript) |
| `pnpm typecheck` | Route types, then `tsc --noEmit` (strict) |
| `pnpm test` | Vitest: mock business rules (double signature, lockout verification, steps) and UI logic |
| `pnpm e2e` | Playwright: every screen renders, the full lockout with its refusals (terminal and lead's laptop), the double signature, editing in review, the zone filter, the wall theme, the PDF viewer and the camera (Chromium's fake camera; denied, missing and insecure are simulated). Starts its own dev server on port 3210; stop `pnpm dev` first |
| `node scripts/screenshots.mjs http://localhost:3000` | Light and dark screenshots of every screen, each as its user, into `app/screenshots/` (gitignored) |

## Trying the demo

- **Acting as.** The top bar's person menu switches between the fictitious people (the mock's `/auth/switch`),
  so the rail, the home screen and the allowed actions follow their roles. A link can do the same: `?as=u-pvidal`.
- **Lockout with two terminals.** Open `/cases/c-424/run` as Ana Ruiz, scan the point and the lock, take the
  photo and hold to apply. Then "Open as another terminal" opens `/kiosk/verify` in a second window: sign in
  with a demo badge (PIN `1234`), scan the lock and hold. Try Ana's own badge (refused: she applied it), the
  wrong lock (refused), then Marta Losada: the first window moves on by itself. Both windows share the mock
  world through `localStorage`.
- **Lockout from a lead's laptop.** A shift lead (or a named verifier) can verify from their own signed-in
  device: Safety → Waiting → Verify opens `/safety/verify`. The same rules apply: not the person who applied
  it, not the device that applied it. In the mock each persona works from their own device (Ana `d-aruiz`,
  Marta `d-mlosada`, the rest the workshop terminal), so applying as Ana and verifying as Marta works.
- **Double signature.** `/review?v=pv-pel-002-1` as Ana Ruiz gives the engineering signature; as Pablo Vidal
  (`?as=u-pvidal`) the safety one. Two signatures from different people on the same hash approve the version.
  Editing a version in review is allowed: Studio asks first, names the signatures it will invalidate, and saving
  returns it to draft.
- **Zones.** "Unassigned" on My work shows the technician's zone first (Javier: Extrusion) with "All zones" next
  to it.
- **Camera.** Photo evidence opens the real camera with `getUserMedia` (webcam, or the terminal's USB camera)
  and keeps a small thumbnail that the verifier also sees. Browsers only allow it over HTTPS or on `localhost`;
  on plain HTTP, with permission blocked or without a camera the sheet says so and offers a photo file or a
  simulated photo.
- **Manual.** The cited page comes from a real PDF rendered by pdf.js with the passage highlighted. The demo
  bundles a fictitious manual, `app/public/manuals/reducer-r-200.pdf`, made by `app/scripts/sample-manual.py`.
- **Reset.** `⌘K` → "Reset the demo data".

## Stack

Next 16.4.5 (App Router, Turbopack), React 19.3, TypeScript strict, Tailwind 4, Base UI, TanStack Query and
Table, GSAP + Lenis for motion, dnd-kit for the step editor and the dashboard, React Flow (`@xyflow/react`) for
the branch graph, uPlot for the MTTR trend, react-pdf (MIT) over pdf.js (`pdfjs-dist`, Apache-2.0) for manuals, sonner for toasts, lucide icons. pnpm 11.22. A Tauri 2 shell for
the desktop (ADR-A38) can wrap the same build later; nothing here depends on it.

## Design

Araxos uses Atlas's design system, "Pipe Marking Bands", without changing a token: ink chrome, one white
working sheet, teal only on the screen's main data element and focus. Coloured bands only name documents: an
approved Araxos procedure uses the `procedure` band, an Atlas manual keeps `manual`; earlier cases, Viper alerts,
Saber items and evidence are `muted` with their own icon. Safety is always a word and an icon, never colour
alone. The one addition is `--brand` (Morse maroon `#660000`, `#c46a6a` in dark) for the Araxos mark.

Four densities per station (`data-density`): office (Atlas's), workshop (larger type, 48 px controls), panel
(gloved touch, 56 px controls, 64 px main action) and wall (the room display). "Plant contrast" strengthens
borders and text for bright floors. Light, dark and system, the wall included. Motion is subtle and GSAP-driven; see
[`app/MOTION.md`](app/MOTION.md).

## Screens

| Route | Screen |
|---|---|
| `/work` | My work (technician's queue: continue, assigned, unassigned, locks waiting for you) |
| `/dashboard` | Dashboard: cases by state, blocked, MTTR with its interval, repeats, coverage, Saber queue, approvals |
| `/cases` | Case queue and detail (reassign, close with cause and solution) |
| `/cases/new` | New incident and the engine's proposal (with reasons, or an abstention) |
| `/cases/[id]/run` | Run a procedure: steps, cited manual and evidence side by side; safety steps with lock, photo, hold and second-person verification; evidence (camera, file, screen, measurement, note), dictation, Saber, close |
| `/studio`, `/studio/interview` | Procedure editor (sortable steps, branch graph, diff, dry run), PDF import, interview to draft |
| `/review` | Diff, comments, engineering and safety signatures with re-authentication |
| `/knowledge` | Saber: incorporate, ask to clarify, decline |
| `/safety`, `/safety/verify` | Lock register and the safety policy; a lead verifies a lock from their own device |
| `/machines` | Machines with QR labels |
| `/analytics` | MTTR distributions, repeats, coverage, step friction, effectiveness, Saber flow (aggregated only) |
| `/audit` | Append-only audit with chain check and signed export; people, MCP clients and the system apart |
| `/hub` | Group hub: plant KPIs and shared procedures (metadata only) |
| `/settings` | People and roles, devices, terminals and badges, threshold and retention, MCP tokens and pending proposals, licence, this station |
| `/wall` | Room display (no names), in the station's theme |
| `/kiosk`, `/kiosk/verify` | Shared terminal sign-in with badge and PIN; second-person lock verification |
| `/login`, `/setup` | Sign-in with TOTP; first administrator |

`G` then a letter jumps between screens; `⌘K` opens the palette; on a run, `J`/`K` move between steps, `Space`
confirms, `E` adds evidence, `M` a measurement, `D` dictates, `N` notes for engineering, `?` lists them.

## Layout

```
app/src/
  app/            routes: (auth) login and setup, (app) every screen inside the shell, kiosk and wall outside it
  features/       one folder per screen, plus hooks.ts (the only way screens read data)
  lib/api/        types.ts (the /api/v1 contract), mock.ts and fixtures/ (the fictitious world)
  ui/             atoms, cells, organisms, templates (Atlas's kit plus Araxos's domain cells)
  styles/         tokens.css (Atlas tokens, unchanged, plus --brand for the mark)
```

To move to the real server, implement `AraxosApi` over HTTP and export it from `src/lib/api/index.ts`. Errors
are RFC 9457 Problem Details (`Problem`), with the same `type` codes the server will use.

## Licence

Proprietary, all rights reserved, Morse Technologies (see [`LICENSE`](LICENSE)). GSAP is free to use but its
licence is not OSI-approved, which is fine for this closed frontend and would need review before any part of it
is open-sourced. react-pdf is MIT and pdf.js is Apache-2.0; both allow this use with their notices kept.
