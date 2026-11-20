# Araxos Field

Voice notes from field technicians and sales reps, turned into typed actions (work report, material order,
visit, CRM activity) that the office reviews as a diff before anything is written to the company's ERP, CRM or
calendar. Spanish, Galician and Catalan from day one. By Morse Technologies.

This repository is starting over for Araxos Field. Nothing is built yet: the design is being finalised, and the
first work here will be **frontend only**, running on typed mock data:

- the native app (Kotlin Multiplatform with Compose; Android first, iOS prepared): record, review, car mode;
- the office web console: approval queue, action diff, corrections, administration.

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
