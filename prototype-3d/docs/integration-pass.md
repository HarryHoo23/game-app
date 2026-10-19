# Image integration and swish refinement — 2026-10-19

Starting HEAD: **409732cacce6043df18ff8d4fa6fad925384ca63**, checked before edits. Branch: `feat/3d-basketball-prototype`. The exact final commit is provided in the completion message; this report and evidence accompany that commit.

[Open before/after comparison and videos](verification/integration-2026-10-19/comparison.html). Run the dev server and open `/docs/verification/integration-2026-10-19/comparison.html` to play the local clips in a browser.

## What changed

The approved source PNGs remain unchanged, including the parent Phaser files. Four derived WebP materials are shipped. The photographed ball could not be made into a reliable full spherical UV map without inventing its unseen side. The chosen fallback preserves its sampled warm leather color and pebble detail, removes the sample's broad baked lighting, and applies it with continuous triplanar sampling. Analytic black panel seams and subtle surface normal detail rotate with the actual sphere. There are no duplicated photographic highlights or mirrored photo hemispheres. The panel layout is reconstructed rather than a literal full-surface reproduction of the photograph. The sphere and collider both remain exactly 0.12 m in radius.

The rim is one complete 96-segment visual torus, using a periodic paint material derived from both supplied rim photos. This removes the half-torus join and separates its appearance from sprite perspective. Its inner radius/tube are still 0.232/0.017 m, shared with the unchanged 32 capsule colliders. Their existing chord approximation differs by about 1.2 mm at segment midpoints. Nothing enlarges the displayed opening relative to the shared geometry. The cropped backboard art keeps its border proportions and now receives the scene's illumination, with a small visual mount joining it to the ring.

The net illustration is unprojected row by row into a transparent rectangular atlas, then wrapped cylindrically rather than projected onto both faces through cosine UVs. A quarter-turn places its periodic boundary away from the frontal center. Its 429 vertices are allocated once. Deformation updates their positions and normals; the top attachment is fixed, the lower portion moves more, and no cloth collider is added.

Court changes are limited to fine asphalt shading, a soft warm light pool, faint distant fence lines, a thin support silhouette and one floor arc. Idle/aim dots and the ball trail are smaller/quieter because the former bright dots visibly crossed the backboard artwork. Reward text moves to the left of the flight corridor. The existing HUD gains one small mute button, with local preference persistence and unavailable-storage fallback.

## Physical passage and audio timing

The existing scoring module is unchanged. Actual descending Rapier samples are tested against the tapered net volume, including the ball radius. Entry starts a quiet cloth brush and a restrained local net response. Body passage updates the deformation target until the ball exits. A critically damped, fixed-step visual spring follows that target; confirmed makes add the existing 280 ms reward envelope, reduced from a 34% to 12% maximum target stretch. No position, velocity, spin or force is written by the net effect. A non-scoring brush can move the net and play a cloth sound, without creating a make event or point.

The clean swish recording measures the entry brush **66.7 ms before** authoritative scoring confirmation. Swish audio starts only at confirmation and continues the brush character. Rim/board makes use a quieter confirmation tone after their real impact and passage sounds. Rim debounce remains 75 ms per material, so two adjacent rim capsule contacts in the rim-miss trace produce one metallic impact sound.

| Actual recorded case | Event sequence, seconds after release |
| --- | --- |
| Clean swish | entry brush 1.183; confirmed swish 1.250 |
| Rim miss | real rim impact 1.192; no entry or celebration |
| Board make | board impact 1.142; entry brush 1.208; confirmed make 1.292 |

These are simulation timestamps from physical events, not preview estimates. The audio service still creates no context before interaction, queues no deferred sound, caps voices at eight, and stops voices on mute/pause/restart/background pause. Unmute uses the button's trusted interaction to resume audio. Muting survives reload and never consumes a shot. Release is shortened/softened, swish is a shorter filtered brush, and confirmation is quieter. No third-party sound assets were introduced. **Tone, loudness and enjoyment still require a human listener's approval.**

## Art preparation and transfer results

`npm run assets:build` runs `scripts/prepare-art.py` (Python 3 + Pillow with WebP support). It only reads the five approved PNGs in `src/assets/hoop/`. It writes derived assets and `src/assets/production/manifest.json`, including actual dimensions, normalized source crop windows, source SHA-256 hashes, repeat settings and byte counts. Crop choices are centralized in `WINDOWS`; the board uses its alpha bounds automatically. Replacement art can have different dimensions, but must preserve the same subject framing or have its window updated. Keep padded RGBA source PNGs with transparent margins; never edit only a packed WebP. Run `assets:build`, `assets:check`, and the visual tests after replacement. Runtime validates packed dimensions/crop bounds and fails explicitly on stale metadata.

All color maps use sRGB. Transparent net WebP is lossless; the board retains its alpha. The opaque leather and rim contain only the useful source-derived material detail. Originals stay available as references; no PNG is requested by the production page. At actual portrait sizes, the supplied board framing/details remain legible, while the reconstructed ball intentionally differs in its lighting and seam layout. The [comparison page](verification/integration-2026-10-19/comparison.html) contains the images used for inspection.

| Production material | Resolution | Bytes |
| --- | --- | ---: |
| Board | 768 × 449 | 163,540 |
| Leather | 256 × 256 | 32,024 |
| Rim paint | 128 × 128 | 4,016 |
| Net atlas | 512 × 512 | 315,430 |
| **Total** | Four maps from five sources | **515,010** |

The original images total **7,184,030 bytes**: a **92.83%** reduction. Vite inlines the 4,016-byte rim WebP; the other three external images total 510,994 bytes. Current JavaScript is 3,463,967 bytes raw / approximately 1.18 MB gzip, including the inline image and embedded Rapier WASM. This is a transfer budget, not a physical phone load-time claim. The pre-existing large-JavaScript warning remains.

One cached texture is configured per map. A regression first demonstrated 31 version increments from 30 new-ball preparations, then passed after configuring each texture once. Actual recording snapshots show **four art uploads**, 17 geometries with one ball, and seven renderer textures including internal shadow textures. The 30-shot browser case checks that art upload count stays fixed, renderer resources stay bounded, and the body pool remains at three balls.

## Evidence and unchanged gameplay

Before changing runtime code, six actual-touch cases were recorded at the starting HEAD under `verification/integration-2026-10-19/before/`, with screenshots, complete shot traces and recordings. Existing reviewed screenshots were also extracted directly from that HEAD with `head-` prefixes. Current screenshots cover 320×568, 400×712 and 430×820.

Current short recordings include the real game audio, tapped from the existing master output into MediaRecorder for capture only:

- [Clean swish and moving net](verification/integration-2026-10-19/after/recordings/clean-swish.webm)
- [Real rim miss](verification/integration-2026-10-19/after/recordings/rim-miss.webm)
- [Real board contact and make](verification/integration-2026-10-19/after/recordings/board-contact.webm)

Clips capture the full 400×712 viewport with actual native touch input. No scores, body transforms or simulation clocks were injected. Screenshots are paced by wall time and encoded at 25 fps, repeating frames when capture is slower; these clips do not measure device FPS. VP8 video and captured Opus audio are muxed without changing game events. Timing is for visual review, not a sample-accurate AV latency measurement.

[Physical comparison](verification/integration-2026-10-19/after/physical-comparison.json) proves equal launch velocities, contact kinds and outcomes for these three cases. All **138 matched physical position samples have exactly zero position deviation** from the baseline. Ball/rim dimensions, spin sign, launch mapping, input forgiveness, Rapier flight, collision settings, downward scoring, recovery and unlimited practice are unchanged. This does not establish a human make rate.

`after/recording-summary.json` records source SHA-256 hashes for the exact runtime used in the videos; those hashes are checked against the delivered files. `after/traces/` includes physical samples, audio/entry timestamps, net observations and resource counts. [Verification log](verification.md) links final test outputs.

Final checks: **42/42 unit and real-Rapier tests**, **24/24 browser cases**, packed-art regeneration check, TypeScript/production build and ESLint passed. Chrome decoded metadata for all three VP8/Opus videos without errors. An earlier browser assertion still assumed that all net motion began after scoring; it was updated to wait for authoritative scoring before checking celebration, while separate tests verify earlier entry. Runtime behavior was not delayed to satisfy that obsolete assumption.

## Changed implementation files

All paths below are under `prototype-3d/`; no parent Phaser source, asset or package file changed.

- `src/App.tsx` — pass the existing audio service to HUD controls.
- `src/audio/shotAudio.ts` — persisted mute, safe storage access and resumed-context handling.
- `src/audio/synthesis.ts` — quiet entry brush and restrained existing timbres.
- `src/config.ts` — visual-only net/trajectory tuning.
- `src/domain/shotFeedback.ts` — observed entry, spring targets, timed events and reset state.
- `src/scene/art.ts` — cached optimized art loading.
- `src/scene/artGeometry.ts` (new) — shared visual geometry, metadata validation and one-time texture configuration.
- `src/scene/Ball.tsx` — source-derived continuous leather/panel shading.
- `src/scene/Hoop.tsx` — one ring, board shading and mount.
- `src/scene/Net.tsx` — cylindrical mapping and local passage deformation.
- `src/scene/Court.tsx` — restrained lighting and depth cues.
- `src/scene/PracticeScene.tsx` — observe actual ball samples; read-only resource diagnostics.
- `src/ui/PracticeHud.tsx`, `src/ui/styles.css` — mute and unobstructed reward placement.
- `src/assets/production/{board,leather,rim,net}.webp`, `manifest.json` (new derived assets).
- `scripts/prepare-art.py`, `scripts/capture-integration.mjs` (new); `package.json` adds art commands.
- `tests/art.test.ts`, `tests/netPassage.test.ts`, `tests/browser/integration.spec.ts` (new); `tests/audio.test.ts`, `tests/rewards.test.ts`, `tests/browser/rewards.spec.ts`, `tests/browser/lifecycle.spec.ts` updated.
- `README.md`, `docs/licenses.md`, `docs/verification.md`, this report, comparison page and evidence folders document the pass. Existing portrait/trajectory/polish screenshots are refreshed by their tests.

## Remaining limits and next phone playtest

The ball's unseen side is reconstructed, not recovered photographic UV art. The net remains an alpha-textured illustration on a deforming sleeve, with some flat strand intersections at close range; it is not simulated cloth. Court atmosphere is deliberately sparse. Phone loading, thermal/GPU performance, Safari interruptions and subjective audio quality still need device testing. The previously documented spin-sign issue was not changed.

On the same Wi-Fi, run `npm run dev` in `prototype-3d/` and use Vite's network address on the phone. Start at moderate media volume. Try one shot to unlock audio, then take 20–30 familiar natural swipes. Listen to a clean swish, a rim miss and a board contact; compare how early the net starts reacting and whether reward text leaves the ball visible. Toggle mute, reload, unmute, pause and background the browser once. Report any doubled impact, late swish, visible texture jump, overly dark ball or new shooting frustration. Export Session log before restarting. The next decision is human feedback, not another feature pass.
