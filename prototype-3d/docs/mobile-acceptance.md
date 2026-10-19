# Final visual and mobile acceptance — 2026-10-19

Baseline checked before work: **084a6378076411faed351a4415bbc9872687c7b6**, branch `feat/3d-basketball-prototype`, initially clean. The final commit SHA is in the completion message. This is a targeted acceptance pass, not another feature implementation.

[Before/after portraits and four sound recordings](verification/acceptance-2026-10-19/comparison.html). With the prototype dev server running, open `/docs/verification/acceptance-2026-10-19/comparison.html`.

## Findings and the one runtime correction

The central decorative support projected straight through the open net and toward the prepared foreground ball. Only its non-colliding mesh in `src/scene/Court.tsx` changed: X 0 → 0.65 m, center Y 1.35 → 1.6 m, height 2.7 → 3.2 m. The pole now reaches the rear/right of the board and clears the central flight corridor. Its depth, material, mesh count and collision-free status stay the same. The floor collider and all physical geometry are unchanged.

Actual before/after screenshots cover **320×568, 400×712 and 430×820**. The support correction is visible at all three sizes. The ball retains the supplied source's warm leather color and fine pores, with lighting variation and continuous rotating analytic seams. Ascent/apex/descent frames show different actual physical rotation angles without obvious seam discontinuities or shader flashes. No ball material edit was justified. Idle dots remain visible but restrained over the board; the aim preview deliberately becomes clearer while aiming. The left-side reward leaves the ball/net corridor visible. The entry and confirmation frames show front strands occluding the ball correctly as it moves down through the sleeve.

Remaining visual compromises: the unseen photographic ball surface and seam layout are reconstructed. A substantial increase in photographic fidelity needs an approved, genuine UV-ready leather/panel texture with clear reuse rights; no unseen photographic art was invented here. The net is an illustrated transparent sleeve, so close-up strand intersections remain flat. The sparse court and offset straight support are deliberately simple. These are documented limits, not reasons to restart visual development before human feedback.

## Rendered passage and captured sound

The recordings contain **actual existing Web Audio output**, copied to a recording destination after user input. They do not play replacement audio or inject game events. Native touch launches the real ball. Read-only samples and event-frame screenshots bracket the actual render time; they do not move bodies or alter simulation time.

| Case          | Physical/audio sequence after release                               | Outcome                   |
| ------------- | ------------------------------------------------------------------- | ------------------------- |
| Clean swish   | cloth entry 1.183 s; lower-plane confirmation and swish 1.250 s     | one point, one swish      |
| Rim miss      | rim impact 1.192 s; adjacent capsule contacts debounce to one sound | no entry or reward        |
| Board contact | board impact 1.142 s; entry 1.208 s; confirmation 1.292 s           | one point, one make layer |
| Consecutive   | swish → rim miss → board make → swish, same session                 | 4 attempts, 3 makes       |

`after/traces/*.json` includes per-shot contacts, physical crossings, audio events, observed net poses and screenshot brackets. The first consecutive swish and single board-contact entry frames are bracketed before scoring; confirmation frames show the ball lower in the net with the once-only reward. Other screenshot brackets can cross confirmation because capture takes time, so those images are not proof of pre-score appearance. Final observations show stretch/X/Z/bulge settled to zero. The cloth sound begins at real descending ball/net-volume overlap, before scoring; a small visual spring follows physical passage. Net movement never writes Rapier position, velocity or force, and the ball continues downward without being pushed or trapped. The existing non-scoring brush unit case verifies cloth response without a basket celebration; that case uses controlled domain samples, not a claimed physical-phone recording.

Videos: [clean swish](verification/acceptance-2026-10-19/after/recordings/clean-swish.webm), [rim miss](verification/acceptance-2026-10-19/after/recordings/rim-miss.webm), [board contact](verification/acceptance-2026-10-19/after/recordings/board-contact.webm), [four consecutive shots](verification/acceptance-2026-10-19/after/recordings/consecutive.webm).

Full-viewport screenshots are paced by wall time and encoded at 25 fps, duplicating frames when capture is slower. These are review clips, **not device FPS or sample-accurate audio latency measurements**. Subjective sound quality still needs listening on a phone.

## Gameplay preservation

[Physical comparison](verification/acceptance-2026-10-19/after/physical-comparison.json) compares the three single-shot recordings with the previously accepted integration traces. Launch linear/angular velocities, contact kinds and results match. **138 corresponding physical samples have zero position deviation.** The recording manifest hashes all runtime source files; only `Court.tsx` differs from the accepted runtime.

Launch mapping, forgiveness, gravity, restitution, spin, dimensions, camera, Rapier collision settings, downward scoring and recovery are untouched. The known X-spin sign discrepancy remains separate: the configured `backspin: -7` produces forward spin for negative-Z flight; it was not silently corrected. The DEV session log/export and source labels remain available. All automation used separate browser contexts, not the user's existing game tab.

## Automated checks and mobile scope

Final check logs and browser JSON are under [checks/](verification/acceptance-2026-10-19/checks/).

- **42/42 unit and actual-Rapier tests**, 17 files.
- **27/27 browser cases**, including three new acceptance cases.
- ESLint, optimized-art regeneration check, TypeScript and production build pass.
- Original Phaser **106/106 unit tests** pass; its source/assets/packages are unchanged.
- Three portraits use native emulated touch, real baskets and reward bounds. Compact HUD controls settle at 36×36 CSS pixels (40×40 at normal height); inside-edge native taps, mute labels/pressed state, pause/resume and restart work without consuming shots. The first new dimension assertion measured the existing press-scale transition; the test now waits for the settled hit area, with no runtime UI change.
- Native held aiming cancels across resize/rotation and restart. Real shots work in landscape and portrait after returning. This is viewport emulation, not a physical orientation-sensor/browser-toolbar test.
- Existing tests cover held-gesture pause, released-flight resize, native cancellation/multitouch, persisted mute, simulated visibility pause and explicit resume, and DEV export fallback.
- A real `WEBGL_lose_context` loss/restore returns to playable rendering. Repeated restart after restoration does not keep uploading art or accumulate textures/bodies. The 30-shot case bounds the body pool, geometry/texture counts, uploads and listener counts. These are resource-count checks, not a physical GPU/heap/thermal profile.
- Production loads the optimized WebPs successfully without requesting source PNGs. No new art or sound assets were added. Four maps remain 515,010 bytes; production JavaScript remains approximately 3.464 MB raw / 1.180 MB gzip. The existing large-bundle warning remains.

**No physical iPhone or Android was available.** Real Safari audio interruptions, browser chrome/safe areas, memory pressure, cold-load time, device FPS, battery/heat and thumb comfort are unverified. A real two-tab headless probe did not change `document.hidden`; it is recorded in `checks/tab-visibility-probe.json` and is not counted as OS background coverage. The application visibility logic is tested by a simulated event; actual background/foreground behavior belongs in the checklist below.

## Reproducible 25–30-shot phone playtest

Use iPhone Safari and Android Chrome on actual phones, ideally one smaller/older device too. Keep the same camera and gameplay settings.

1. On the computer run `npm run dev` inside `prototype-3d/`. Connect the phone to the same Wi-Fi and open Vite's printed network address on port 5174. Record phone model, OS/browser version, orientation and media volume. Start a screen recording with game audio if supported; record cold-load time separately.
2. Take **5 familiarization shots** using your ordinary upward swipe. Start near the ball's edge once; allow natural small horizontal drift. Check that the source-derived leather remains legible as the ball rotates, the support clears the net, and trajectory dots/reward text leave the basket readable.
3. Take **20 consecutive measured shots**, without restarting or deliberately reproducing an automated swipe. Record each make/miss and whether you understood why it missed. Note frustrating misses, excessive precision, lag, dropped touches or waiting for the next ball. Compute makes/20 separately from the warm-up. The provisional 50–70% target is a human hypothesis, not an automated pass result.
4. Across these shots, listen for release, rim and board differences and a clean swish. Watch entry/cloth response before the once-only reward, ball movement through the net, and a quick settled net. Note doubled/late sounds, trapping/pushing appearances, texture jumps or reward overlap. If a natural non-scoring net brush occurs, confirm no point/SWISH. Do not force a fake result.
5. **Export Session log before restarting.** Toggle mute, reload and check it stays muted; unmute with a tap. Pause during a shot, wait, then Continue. Aim and rotate once, release, and ensure no accidental shot. Rotate back and make a normal shot. Aim then restart and check the old release cannot fire.
6. Switch to another app for 10 seconds during a shot, return and check explicit Continue, preserved flight and usable audio. Repeat once with the screen locked. Take **up to 5 final recovery shots** after these interruptions. Watch for black canvas, repeat texture uploads/loading, rising heat or slowing response. Check small controls with one thumb and browser bars expanded/collapsed.
7. Send the exported JSON, the 20-shot results, any recordings, phone/browser details and three brief ratings: easy to learn, understandable misses, desire to retry. Note loudness and timing separately. Keep warm-up/interruption shots separate from the measured make rate.

Stop after this pass. The next product decision follows human play and listening; no new modes, scoring rules or major visual systems were added.

## Exact implementation/document changes

All changes are isolated to `prototype-3d/`:

- `src/scene/Court.tsx`: the decorative support correction only.
- `scripts/capture-integration.mjs`: current-HEAD metadata, optional accepted baseline directory, four-shot recording, rotation/entry frames and read-only timing, stricter physical comparison.
- `tests/browser/acceptance.spec.ts`: native compact HUD, aim interruption/orientation and real WebGL restoration checks.
- `docs/mobile-acceptance.md`, `docs/verification.md`, `README.md`: report, checklist and latest-evidence links.
- `docs/verification/acceptance-2026-10-19/`: before/after screenshots, comparison page, actual sound recordings, physical/event traces, manifests and check logs.

No new runtime image/audio assets, dependencies or gameplay systems.
