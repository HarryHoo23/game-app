# Basketball MVP verification

Date: 2026-10-14. Branch: `feat/basketball-mvp`.

## Delivered

Playable local browser MVP: main menu, ten configured levels, touch/mouse shooting, fixed-step Matter physics, independent directional basket detector, 2/3/4-point scoring, shot budgets, stars, success/failure results, unlocks, replay rewards, four upgradeable equipment categories, local saves, responsive portrait UI and basic feedback.

## Automated evidence

- `npm test`: 26 passing tests across two files. Covers scoring direction/clearance/duplicate/ground-bounce cases, final-shot lifecycle, stars, upgrades, idempotent rewards, malformed/future/unwritable saves, actual bundled Matter shots for all ten courts, and preview positions against actual fixed-step flight.
- `npm run build`: strict TypeScript check and Vite production build pass.
- `npm run lint`: passes.
- `npm run format:check`: passes.
- Physics browser check: circle shape retains the ball label, radius, restitution and zero air resistance.
- Lifecycle browser check: exiting a court and restarting produce no page exceptions.
- Mobile browser check: actual touch cancellation does not consume a shot; actual touch drag makes a basket. Small-screen pause/navigation, purchase/reload, and desktop portrait ratio pass.
- Campaign browser check: ten real mouse drags score 30 points, earn three stars and 96 coins, unlock court 2, and survive reload. The last airborne shot does not show a premature result. Pause freezes flight.
- Failure browser check: ten missed shots lead to failure, award no coins, and retry resets score and shots.

Browser scripts use installed Google Chrome through Playwright. They inspect game state to wait for readiness; actual shot actions use mouse/touch input, not injected score or simulated success. The equipment persistence check seeds coins only to exercise an affordable purchase.

## Review and fixes

A separate read-only reviewer examined scoring, final shots, lifecycle, input, upgrades and storage. The reviewer found TypeScript errors in the Matter integration test; adding Node types and explicit boundary casts corrected them. Formatting findings were corrected.

Browser playtests independently exposed two runtime defects, both reproduced before correction:

1. Replacing the basketball body with a circle discarded label and physics parameters. The new circle now receives those parameters explicitly; the physics browser check prevents recurrence.
2. Phaser nulls the scene's world reference before custom shutdown callbacks. Cleanup now uses the captured world subscribed to initially; exit/restart and complete-run browser checks prevent recurrence.

## Implementation decisions

- Work stays in the original VS Code project directory on a feature branch. No separate worktree was created; the project had no application code to preserve. No merge or remote publication was performed.
- The user explicitly approved development after the design review. The implementation plan was recorded and execution continued inline.
- Court 10 uses 14 shots rather than 12, because 36 points × 1.4 requires 51 points for three stars; 12 shots could only earn 48. This keeps the top star attainable with starter equipment.
- Self-hosted Barlow fonts replace external font requests so the game can run without a font service.
- Browser checks were added as integration defects were discovered. They complement the test-first domain checks; this is not a claim that every UI method was developed with a failing unit test first.

## Remaining validation

Phone checks used browser emulation, not physical iPhone or Android devices. Real-device safe-area behavior, sustained hardware performance, perceived shooting feel, and final economy balance remain playtest work. No hardware-performance measurement was performed.

The production build emits Vite's size warning for the Phaser vendor chunk (about 1.48 MB raw / 340 KB gzip). The engine is isolated in a cacheable vendor bundle; no claim of store-release readiness is made.

No known important defect remains from the checks above. The full campaign's difficulty and rewards are initial tuning values, ready for player feedback.
