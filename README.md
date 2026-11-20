# Araxos Field

Voice notes from field technicians and sales reps, turned into typed actions (work report, material order,
visit, CRM activity) that the office reviews as a diff before anything is written to the company's ERP, CRM or
calendar. A general product for companies across Spain, in Castilian Spanish; Galician and Catalan are
additional voice languages. By Morse Technologies.

The work so far is **frontend only**, on typed mock data. The backend (Rust) is designed but not built.

## The web prototype (`app/`)

Next 16 + React 19 + Tailwind 4 + TanStack Query + GSAP, on a typed mock API that mirrors the Field OpenAPI.

- **Office console**: approval queue, three-column review (what was said, what Field proposes, what will
  change), diff against Odoo, provenance, conflicts, corrections, double signature, history, audit chain and
  administration (connectors, action types, vocabulary, users, settings). `⌘K` opens the command palette.
- **Mobile** (`/m`): record with a live microphone waveform and a streaming transcript, review, car mode and
  history. Usable on a phone; on a desktop it is shown inside a phone frame.
- Liquid Glass surfaces with squircle corners, light and dark themes, and solid fallbacks (reduce transparency,
  sun mode, high contrast, reduced motion).

```bash
cd app
pnpm install
pnpm dev                                   # http://localhost:3000 → /queue, and /m for the phone
pnpm typecheck && pnpm lint && pnpm test   # types, lint, unit tests
pnpm e2e                                   # Playwright smoke tests (fake microphone)
pnpm build
```

More in [app/README.md](app/README.md) (in Spanish) and [app/MOTION.md](app/MOTION.md).

The native app (Kotlin Multiplatform with Compose; Android first, iOS prepared) comes next.

## The industrial Araxos

The earlier product, guided maintenance for industrial plants (web and desktop frontend on a mock layer), is
archived and no longer developed here:

- branch [`archive/industrial`](https://github.com/Morse-Technologies/araxos/tree/archive/industrial)
- tag [`industrial-final`](https://github.com/Morse-Technologies/araxos/releases/tag/industrial-final)

```bash
git switch archive/industrial   # or: git checkout industrial-final
cd app && pnpm install && pnpm dev
```

## Licence

Proprietary, see [LICENSE](LICENSE).
