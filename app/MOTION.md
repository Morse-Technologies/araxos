# Motion in Araxos Field

Field moves the way Atlas does, with one addition: surfaces are glass, so motion also explains *depth*. Things
glide from where they were to where they land, settle with a soft spring and never bounce. Motion tells you
where something came from, what changed or that the app is listening. It never decorates. Every animation is
GSAP (Flip and CustomEase are registered in `src/lib/gsapIn.ts`) or a CSS keyframe in `globals.css`; Lenis runs
on `gsap.ticker`, so there is one clock. Every helper checks `reduced()` first.

Source: ARAXOS-FIELD.md §7.6.

## Tokens

| Token | Value | Use |
|---|---|---|
| `SPRING` (`field-spring`) | `M0,0 C0.12,0.62 0.22,0.96 0.42,1.012 0.6,1.02 0.78,1 1,1` | Shared elements, cards settling, glide pill (overshoot ≤ 1.2 %) |
| GSAP `power3.out` | — | Enters and fades |
| `back.out(2)` | — | Only the «Aplicado» stamp |
| `DUR.fast` / `base` / `slow` / `flip` | 120 / 200 / 320 / 550 ms | Press · popovers · sheets · shared-element moves |
| `STAGGER.words` / `rows` / `cards` | 30 / 40 / 60 ms | Transcript words · queue and audit rows · review cards |
| Parallax | ≤ 6 px | The ground behind the glass and the record card |

## Patterns

| Pattern | What moves | Where |
|---|---|---|
| Shared element | The customer name flies from the queue row (or the phone card) to the note header | `captureShared` + `useSharedTarget`, `data-flip-id` |
| Directional exit | Approve slides the row right, reject slides it left, then the list closes the gap | `slideAway` in `NoteDetail` / `QueueList` |
| Confirmation | «Aplicado» stamps in once; undo reverses the state, never the animation | `stamp` |
| Parenting | Tabs and the phone tab bar have a pill that glides to the active item | `useGlide` in `tabs.tsx`, `PhoneShell` |
| Listening | The waveform follows the microphone RMS (or a synthetic envelope); words appear 30 ms apart; entities underline as they are recognised | `Waveform`, `Record`, `revealWords` |
| Value change | The dock summary and the total update in place; nothing counts up | `Dock` |
| Masking | The theme switch reveals the new theme as a circle from the button | `useTheme().toggle` (View Transitions) |
| Overlay | Dialogs and the phone sheet rise from their edge over a scrim | `overlay.tsx`, `Review` |
| Feedback | Buttons press to 0.97, phone cards to 0.98; every write ends in a toast | `atoms.tsx`, `sonner` |

## Left out on purpose

| Principle | Why |
|---|---|
| Bounce / elastic | Glass that wobbles reads as cheap; the spring settles without a visible bounce. |
| 3D tilt | Specular edges already give depth; tilting moves the text being read. |
| Looping | Only the recording dot pulses while the microphone is open; nothing else loops. |

## Reduced motion

`prefers-reduced-motion: reduce` keeps opacity fades and drops travel, scale, Flip, parallax, the glide (the
pill is placed instantly), the word stagger and the theme reveal. In CSS the `@media (prefers-reduced-motion:
reduce)` block in `globals.css` clamps transitions and keyframes. Screenshots and the Playwright smoke run
with reduced motion so they are stable.
