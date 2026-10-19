# 3D practice prototype — verification log

Branch: `feat/3d-basketball-prototype`. The existing Phaser implementation remains available. Scope remains unlimited practice; the user has now reported improved shooting feel and successful human baskets.

## Image integration and synchronized net refinement — 2026-10-19

Baseline HEAD: `409732cacce6043df18ff8d4fa6fad925384ca63`. See [integration report](integration-pass.md) for exact implementation files, source-art compromise, media, timings, budgets and phone instructions. [Before/after page](verification/integration-2026-10-19/comparison.html).

- Prototype unit/actual-Rapier tests: **42 passed across 17 files**. [Output](verification/integration-2026-10-19/checks/unit.log).
- ESLint and packed-art reproducibility check passed. [Lint](verification/integration-2026-10-19/checks/lint.log), [art check](verification/integration-2026-10-19/checks/assets.log).
- Final production TypeScript/build passed. JavaScript: 3,463,967 bytes raw / about 1.18 MB gzip. [Build output](verification/integration-2026-10-19/checks/build.log).
- Final complete browser suite: **24/24 passed** with runtime source held unchanged, including 30-shot GPU/resource bounds. [Output](verification/integration-2026-10-19/checks/browser.log), [structured results](verification/integration-2026-10-19/checks/browser-results.json).
- All three VP8/Opus recordings loaded in Chrome at 400×712 without media errors. [Media check](verification/integration-2026-10-19/checks/media.json).
- A real Rapier test verifies descending net entry/motion before authoritative scoring, and a non-scoring brush without celebration. Texture tests verify metadata, alpha-derived board proportions, render/collider size parity, one full ring, fixed net attachment and no repeated texture version/upload requests.
- Actual native-touch recordings compare three launch velocities/outcomes and **138 physical position samples** with the baseline: **zero position deviation**. [Comparison](verification/integration-2026-10-19/after/physical-comparison.json).
- Four source-derived WebPs total **515,010 bytes**, down **92.83%** from **7,184,030 bytes** of PNGs. Their originals and all parent Phaser files remain unchanged.
- The source hashes in the final [recording summary](verification/integration-2026-10-19/after/recording-summary.json) match all 40 delivered runtime files. Videos contain native-touch gameplay plus a tap of actual Web Audio output; no scores, body transforms or clocks are injected.

Browser coverage now includes three portrait sizes, pre-score net entry and post-score swish timing, muted/reloaded/unmuted shooting, accessible controls outside the shot area, bounded geometries/textures/art uploads across 30 shots, pause/restart cleanup and production WebP loads. Human sound quality approval and physical phone load/performance remain pending. Older sections below describe their original commits and media.

## Hoop, audio, net and HUD pass — 2026-10-19

The shared rim is now 0.232 m inner radius / 0.017 m tube radius; ball radius remains 0.12 m. Real Rapier tests preserve makes across five straight 20–40% upward swipes, as well as front/back-rim and board responses. The supplied project PNGs now texture the 3D sphere, board, hollow rim and deformable net. A confirmed basket triggers a 280 ms net pull with directional sway and a restrained animated HUD reward. Audio is original synthesis driven by accepted release, physical contacts and confirmed makes, unlocked only after player interaction. Full file/asset list and replacement instructions: [presentation pass](presentation-pass.md).

Current unit/integration verification: **36 passed across 15 files**; prototype TypeScript/build and ESLint passed. Original Phaser tests: **106 passed**, with original lint passed and no changes outside `prototype-3d/`.

The final full Chrome run passed **19/19 cases**, including the 30-shot loop, production build, four viewport sizes, physical rim/board outcomes, audio/net rewards and existing trajectory controls. The earlier distance-only observer caused one failing rim fixture; after the impulse-based fix, all 19 passed in one unchanged-source run. The final browser report is saved as [polish-browser-results.json](verification/2026-10-19/polish-browser-results.json).

A new real-Rapier regression reproduced missed contact observation: a thin-rim rebound had positive impulses at +1.97 mm solver separation, beyond the old 1 mm distance threshold. Contact observation now also recognizes positive physical impulses; the regression failed first and then passed. No force, launch or flight correction was added.

New browser checks read actual Web Audio state/playback counts and physical event records. They verify no pre-interaction context, release/swish playback, distinct real rim/board events, one reward per make, no new net pulse on a miss, 320×568 touch input, paused voices/net time and restart cleanup. Current screenshots: [Ready](verification/2026-10-19/polish-ready.png), [Swish](verification/2026-10-19/polish-swish.png), [Small-screen pause](verification/2026-10-19/polish-pause-small.png). Phone and desktop renders were visually inspected. Listening quality and device performance still need human review.

## Trajectory visualization follow-up — 2026-10-19

Added an idle dotted baseline arc, live swipe preview using the release launch calculation, and a 0.32-second shrinking trail sampled from actual Rapier positions. A ball-sized shape sweep stops the preview at the first solid contact; it does not predict rebounds or guarantee makes. Trails continue sampling resolved balls while they remain in the bounded body pool. Cancelled aiming restores the baseline; pause hides both effects; restart removes old samples. No launch tuning, scoring or original Phaser source changed.

Fresh verification: **29 logic/actual-Rapier tests**, TypeScript/production build and ESLint passed. Browser coverage comprises **17 cases**: 16 passed in the full run; the 30-shot case timed out during a documented Vite hot update while source was being saved, then passed on a clean isolated rerun with unchanged source. The run exercised live-preview/release velocity agreement, native touch cancellation at 320×568, pause/resume, restart cleanup, physical baskets/contacts and continuous shooting. Screenshots were visually inspected at phone and desktop sizes. This remains automated evidence, not human playtesting.

Current visuals: [Ready](verification/2026-10-19/trajectory-ready.png), [Aiming](verification/2026-10-19/trajectory-aiming.png), [Actual flight trail](verification/2026-10-19/trajectory-flight.png). The older recordings below predate this visual addition. Settings live in `config.shotVisuals`; fixed-size buffers and instanced dots bound memory and draw calls.

A separate review of this visualization change found no actionable issues.

## Original first-slice checks (before presentation updates)

| Check | Result |
| --- | --- |
| Prototype unit + actual Rapier integration | 25 tests passed across 11 files |
| Prototype TypeScript + production build | Passed |
| Prototype ESLint | Passed |
| Chrome acceptance suite | 15 passed, including native touch inputs and held-gesture restart/pause regressions |
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

See recording-summary.json and browser-results.json in that directory for machine-readable evidence. Clips were captured before the final held-gesture cancellation fix; launch mapping, physical geometry and scoring were unchanged by that fix. Source manifests distinguish the recorded and reviewed runtime. This host's native Chrome screencast cropped tall viewports; the capture script instead records real full-viewport screenshots, paced by wall time and encoded at 25 fps. Capture cadence is variable and duplicate frames preserve elapsed time; this is not a device FPS measurement. No gameplay state is changed by recording.

## Limits and next action

- Human learnability, enjoyment and the provisional 50–70% make-rate goal await a 20–30 shot playtest on the user's device. Automated chosen gestures cannot establish them.
- No physical iPhone/Android performance or thermal testing has been done. The current production JavaScript is approximately 3.45 MB / 1.17 MB gzip, plus about 0.511 MB of external WebPs (the small rim map is inlined; all four total 0.515 MB); cold-load cost remains to measure and the art can be optimized later.
- Environment meshes and lighting remain simple. Visual net feedback and audio are now implemented in the presentation pass above; three-miss arcade rules/best-score persistence remain deferred as agreed.
- Independent review identified one minor tuning defect deferred to the next feel pass: the configured X spin is forward spin for travel toward negative Z, despite the `backspin` name. Physics remains active and plausible, but correcting that sign should include retesting rim/board responses; the headless contact helper also needs to apply the same angular velocity.
- The rim uses 32 capsules rather than an exact torus collider; chord approximation differs by about 1.3 mm at segment midpoints. Geometry parameters are shared with rendering.
- Rebounds remain physical; a previous ball can briefly remain visible while the next one is ready. Cleanup and collision groups prevent it blocking the next shot.
- Missing/inaccessible clipboard falls back to download. Pausing preserves simulation rather than elapsed wall time; returning from the background requires an explicit Continue.

Next: run `npm run dev` from prototype-3d/, listen on phone speakers/headphones and try 20–30 natural swipes with the smaller rim. Export Session log before restarting. Tune sound and feedback after human observations. No game modes or replacement of the Phaser application are included in this pass.

## Implementation decisions and independent review

- Used the requested branch plus prototype directory in the existing checkout. Cost: that checkout should not simultaneously host unrelated changes to the old game.
- Extracted a small pure practice lifecycle module beside the store to test cooldown/pool behavior deterministically. Cost: one additional module to maintain.
- Added a root Vitest test-directory boundary after actual test discovery failures. Cost: future root test directories must be added explicitly.
- The reviewer set aside human make rate/enjoyment and physical-device performance because no such testing exists. These remain unverified and may require further tuning after the user's playtest.

One independent whole-branch review found no critical issues, one important gesture-ownership issue and the spin-direction minor above. The important issue was reproduced with actual held pointer + keyboard restart/pause and a unit test of paused aiming. Its fix cancels captures on session/pause transitions and restores ready rather than orphaned aiming; all three regressions failed first and passed after the fix. No second review round was performed.
