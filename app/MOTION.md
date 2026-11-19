# Motion in Araxos

Araxos moves the way Atlas and Viper do: little, fast and always with a reason. Motion explains where something
came from, what changed, or that the app heard you. It never decorates, and on a safety step it never hurries:
holding is the only way to commit. Every animation is GSAP (or a CSS keyframe from `globals.css`), shares one
clock (Lenis is driven by `gsap.ticker`), and checks `reduced()`.

Source of the principles: Mockplus, *20 Motion Design Principles with Examples* (Oct 2025). The table maps
each principle Araxos uses to the concrete pattern, its tokens and where it lives. Principles left out on
purpose are listed at the end with the reason.

## Tokens

| Token | Value | Use |
|---|---|---|
| `--ease-out` / GSAP `power3.out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Everything that enters or settles |
| `--ease-in-out` / GSAP `power3.inOut` | `cubic-bezier(0.77, 0, 0.175, 1)` | Things that move from A to B (indicators, Flip, theme reveal) |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Sheets and the sidebar |
| `--dur-1` | 120ms | Press, hover |
| `--dur-2` | 200ms | Popovers, indicators, fades |
| `--dur-3` | 320ms | Sheets, sidebar width, progress bar |
| GSAP enter | 0.7s, y 14px, stagger 0.06s | Screen parts on mount (`useEnter`) |
| CSS `enter` | 260ms 10px | Detail panes, editor tabs, list rows |
| Hold | 800ms; 1200ms for safety | `HoldButton`: send to review, approve MCP, revoke; apply or remove a lock, verify, sign |

## Principles used

| Principle | Pattern in Araxos | Where |
|---|---|---|
| Easing and timing | Exponential ease-out for enters, balanced curve for moves, drawer curve for sheets; three durations only | `globals.css` `@theme`, all GSAP calls use `power3.*` |
| Offset and delay | Screen parts rise 14px in order, 60ms apart; audit rows settle 12ms apart when a filter changes | `useEnter` in `Canvas`; `AuditTable` |
| Smooth content reveal | Each screen fades and rises once on mount; a case, a version or a step opens with a 260ms rise; route changes use View Transitions | `Canvas`, `animate-enter`, `AppShell` |
| Parenting | The tab underline and the segmented pill belong to their row and glide to the active item | `Tabs`, `Segmented` (`useGlide`) |
| Transformation (morphing) | Dashboard widgets glide and resize from where they were to where they land | `features/dashboard/layout.ts` (GSAP Flip) |
| Value change | KPIs count up; the rail badge pops when a number goes up; the run's progress bar widens as a step is confirmed | `CountUp`, `usePopOnIncrease`, `RunScreen` |
| Masking | The MTTR trend reveals left to right once; the theme switch reveals the new theme as a circle from the click | `TrendChart`, `features/shell/theme.ts` |
| Directional motion | Sheets slide from their edge (evidence, Saber, close, enrol); dragged steps move along the list axis only | `Sheet`, `StepsEditor` (dnd-kit) |
| Overlay and obscuration | Sheets and modals (re-authentication, shortcuts) dim the page with `--scrim`; the cases peek floats over the rail with `--shadow-float` | `Overlay.tsx`, `AppRail` |
| Micro-interaction / feedback | Controls press to 0.97; kiosk keys press to 0.96; every write ends in a toast; server refusals show their Problem `type` | `Button`, `BadgePin`, `sonner`, `showProblem` |
| Anticipation | Binding actions fill a bar while held and retract if let go early; safety actions take 1200ms so a brush is never a confirmation | `HoldButton`, `SafetyStep`, `VerifyScreen`, `SignModal` |
| Progress indicators | Skeletons, the "Updating" spinner, numbered steps for a new incident, "n of m done" while running, "1 of 2 signatures" in review | `States`, `AppShell`, `Steps`, `RunScreen`, `ReviewScreen` |
| Hover effects | Rows and rail items tint on hover; the primary button leans toward the pointer about 4px | `globals.css`, `useMagnetic` |
| Data growth | Repeat and coverage bars grow from their baseline, one after another | `useGrow` (dashboard) |
| Consistency | One clock, one set of curves and durations, the same pattern for the same meaning on every screen | this file |

## Left out on purpose

| Principle | Why not |
|---|---|
| Parallax | Araxos is read at arm's length with gloves on; parallax moves the text being read. Lenis is the only scroll effect. |
| Dimensionality / 3D | Atlas keeps surfaces flat; depth would break the ink-and-hairline look. |
| Cloning | No element duplicates itself elsewhere; the cited manual page opens in place in the run's right column. |
| Looping animations | Only the spinner and the animated path in a dry run loop. The recording dot is solid red with a running timer, not a pulse; the room display rotates its panel every 12s and stops when motion is reduced. |

## Reduced motion

`prefers-reduced-motion: reduce` keeps fades and drops travel, scale, loops and View Transition animation.
In JS every helper returns early when `reduced()` is true (`useEnter`, `useGrow`, `useGlide` places instantly,
`Flip` is skipped, the trend wipe is skipped, `HoldButton` steps instead of sweeping, the room display stops
rotating, the theme switch applies instantly). In CSS the `@media (prefers-reduced-motion: reduce)` block in
`globals.css` turns `enter` and `bar-grow` into plain fades.
