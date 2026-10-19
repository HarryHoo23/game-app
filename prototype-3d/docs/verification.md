# First playable 3D practice slice — 2026-10-19

Branch: `feat/3d-basketball-prototype`. The existing Phaser implementation remains available. This milestone stops at unlimited practice for the user's first human playtest.

## Verified

| Check | Result |
| --- | --- |
| Prototype unit + actual Rapier integration | 24 tests passed across 11 files |
| Prototype TypeScript + production build | Passed |
| Prototype ESLint | Passed |
| Chrome acceptance suite | 13 passed, including native touch inputs |
| Original Phaser tests | 106 passed across 12 files |
| Original Phaser build and lint | Passed |

Browser checks exercised 320×568, 400×712, 430×820 and 1280×800. All show the foreground ball, hoop and baseline apex within the camera. Real mouse and CDP native touch input produced downward, once-only physical baskets; no score events or ball transforms were injected. Tests also cover short/side/rim misses, backboard contact, input event-count invariance, resize during aim/flight, touch cancellation, extra touches, pause, simulated background visibility, rapid restart, clipboard fallback, initialization failure and absence of DEV controls in the production build.

The continuous practice case completed 30 real-input shots, remained playable after more than three misses, kept at most three ball bodies (six world rigid bodies including the court), and preserved listener counts after repeated restart. Root Vitest now has an explicit src/tests boundary so the old app does not load the separately installed prototype's tests.

Two lifecycle bugs were found and fixed through failing cases: Rapier callback refs do not unregister destroyed bodies automatically; Ball now unregisters explicitly. ResizeObserver may run after pointerup; release now compares the current dimensions to the captured gesture dimensions. The failing consecutive-shot/resize cases passed after their fixes.

Runtime used for browser checks: bundled Node.js 24.19.0 and installed Google Chrome. The host default Node 18 cannot run this Playwright version; use Node 22+ for the documented commands. Package versions and exact resolution are in package-lock.json; notably React 19.3.1, Fiber 9.8.2, Rapier adapter 2.2.0 / engine 0.19.2, Drei 10.7.9 and Three.js 0.186.1.

## Recorded evidence

All videos are portrait 400×712, generated from native touch swipes. Trajectories, launch velocities, contact positions, pre/post-contact velocities and outcomes are in the matching traces. Sources are labeled automation; these recordings are not human playtesting.

| Case | Video | Trace |
| --- | --- | --- |
| Typical make | [Watch](verification/2026-10-19/recordings/01-typical-make.webm) | [JSON](verification/2026-10-19/traces/01-typical-make.json) |
| Clean swish, no contacts | [Watch](verification/2026-10-19/recordings/02-clean-swish.webm) | [JSON](verification/2026-10-19/traces/02-clean-swish.json) |
| Front-rim miss | [Watch](verification/2026-10-19/recordings/03-front-rim-miss.webm) | [JSON](verification/2026-10-19/traces/03-front-rim-miss.json) |
| Back-rim miss | [Watch](verification/2026-10-19/recordings/04-back-rim-miss.webm) | [JSON](verification/2026-10-19/traces/04-back-rim-miss.json) |
| Backboard contact and make | [Watch](verification/2026-10-19/recordings/05-backboard-contact.webm) | [JSON](verification/2026-10-19/traces/05-backboard-contact.json) |
| Five consecutive attempts | [Watch](verification/2026-10-19/recordings/06-consecutive-attempts.webm) | [JSON](verification/2026-10-19/traces/06-consecutive-attempts.json) |

See recording-summary.json and browser-results.json in that directory for machine-readable evidence. This host's native Chrome screencast cropped tall viewports; the capture script instead records real full-viewport screenshots, paced by wall time and encoded at 25 fps. Capture cadence is variable and duplicate frames preserve elapsed time; this is not a device FPS measurement. No gameplay state is changed by recording.

## Limits and next action

- Human learnability, enjoyment and the provisional 50–70% make-rate goal await a 20–30 shot playtest on the user's device. Automated chosen gestures cannot establish them.
- No physical iPhone/Android performance or thermal testing has been done. The production bundle is approximately 3.44 MB / 1.17 MB gzip, largely Three/Rapier and embedded WASM; cold-load cost remains to measure.
- Environment meshes and lighting are simple; the visual net is static, audio is absent, and three-miss arcade rules/best-score persistence are deferred as agreed.
- The rim uses 32 capsules rather than an exact torus collider; chord approximation differs by about 1.3 mm at segment midpoints. Geometry parameters are shared with rendering.
- Rebounds remain physical; a previous ball can briefly remain visible while the next one is ready. Cleanup and collision groups prevent it blocking the next shot.
- Missing/inaccessible clipboard falls back to download. Pausing preserves simulation rather than elapsed wall time; returning from the background requires an explicit Continue.

Next: run `npm run dev` from prototype-3d/, take a few familiarization shots and then 20–30 natural swipes. Export Session log before restarting. Adjust src/config.ts only after observing real misses and the user's feedback. No further features or replacement of the Phaser application are included in this milestone.
