# Hoop, sound and reward pass — 2026-10-19

Historical record for commit `409732c`. The follow-up [image integration report](integration-pass.md) describes the current materials, earlier physical net response, mute control and compressed assets.

The rim now has a 0.232 m inner radius and 0.017 m tube radius. The ball stays at 0.12 m. Visual torus halves, capsule colliders, scoring clearance and preview sweeps all use the same configuration. The launch solver, gesture mapping, spin, recovery and scoring rules are unchanged. Five straight swipes from 20–40% of screen height still make physical baskets in Rapier regression tests; this is not a claim about human make rate.

## Presentation

- The supplied basketball image is projected onto a rotating sphere, rather than a camera-facing sprite. Its back hemisphere repeats the front artwork because the supplied image is not a full spherical UV texture.
- The supplied backboard image is trimmed through texture coordinates and fitted to the physical board. Orange metal strips from the front/back rim images texture two halves of the actual hollow 3D torus. The image silhouette never substitutes for the physical opening.
- The supplied transparent net image textures a tapered open sleeve (429 vertices). Only its visual vertices move. A confirmed make pulls it down and eases back over 280 ms; the top attachment stays fixed. Swish stretch is strongest (34%), rim-make uses 68% of that strength, board-make 76%. Actual pass offset/velocity add bounded lateral sway. No soft-body simulation, ball steering or net collider was introduced. The simulation clock freezes the pulse on pause and resets on restart.
- The HUD separates made baskets and attempts, uses matching outlined round pause/restart buttons, adds an upward arrow prompt, and shows a brief scale/fade `+1 / SWISH`, `BUCKET` or `OFF THE GLASS` reward. Reduced-motion CSS disables HUD animation.

## Audio and replacement

`src/audio/shotAudio.ts` owns one Web Audio context, unlocked synchronously by the player's valid shot pointerdown. There is no context or autoplay before interaction, no deferred sound queue, and at most eight short voices. Pause/restart stops active sources. Failed initialization/resume/playback remains silent without blocking input.

`PracticeScene` sends release only after accepting the launch, impact only from new physical solver contacts, and make only after the existing downward passage confirmation. `src/domain/shotFeedback.ts` debounces rim capsule chatter for 75 ms per material and ignores tiny velocity changes. It emits exactly one reward per resolved shot. Swishes play a short filtered noise brush; rim/board makes play a quieter confirmation tone after their real collision sounds. Rim is a damped metallic ring; board is a lower knock. No feedback event reads the aim preview.

The smaller rim exposed a contact-observation defect: a real rebound applied a solver impulse at +1.97 mm separation, while the old observer accepted only distances ≤1 mm. `domain/physicalContact.ts` now also recognizes positive Rapier impulses. An actual-Rapier regression failed with the old distance-only check and passed with impulse recognition. Physical movement and solver settings were not changed; observed contact classification and the corresponding sound are now accurate for that grazing rebound.

All sounds are synthesized in `src/audio/synthesis.ts` and cached as mono buffers on first playback. There are **no new audio files or external asset dependencies**. Tune master volume with `config.feedback.audioGain`, and timbres/durations in synthesis. To use recorded audio later, add licensed clips under `src/assets/audio/`, import them through Vite, decode/cache them in the buffer-loading portion of `shotAudio.ts`, and preserve its unlock/voice/stop logic and the existing event routing. Do not add fetch/decode awaits to the physics callback.

Five PNGs were copied byte-for-byte from the existing parent art directory into `src/assets/hoop/`: `basketball.png`, `backboard.png`, `net.png`, `rim_front.png`, `rim_back.png`. No source PNG was edited and no external art was downloaded. `hoop-board.png` is a precomposited image and is intentionally unused: the separately rendered 3D parts preserve depth and the open hoop. `scene/art.ts` contains source URLs and the crop helper; mapping details live in Ball/Hoop/Net. Replacement PNGs with different padding need corresponding crop/UV updates.

## Exact implementation files

All paths below are relative to `prototype-3d/`.

Modified:

- `src/App.tsx` — shared audio/feedback services and lifecycle wiring.
- `src/config.ts` — rim size and feedback tuning.
- `src/input/useShotInput.ts` — user-gesture audio unlock.
- `src/scene/Ball.tsx` — supplied art on sphere geometry.
- `src/scene/Hoop.tsx` — matching physical/visual rim, board art, net integration.
- `src/scene/PracticeScene.tsx` — real-event feedback and read-only development diagnostics.
- `src/ui/PracticeHud.tsx`, `src/ui/styles.css` — compact score/reward/control/prompt polish.
- `tests/geometry.test.ts`, `tests/gesture.test.ts` — size and familiar-gesture regression checks.
- `README.md`, `docs/licenses.md`, `docs/verification.md` — current usage, provenance and evidence.

Added:

- `src/audio/shotAudio.ts`, `src/audio/synthesis.ts` — bounded optional audio and original sounds.
- `src/domain/shotFeedback.ts` — deduplicated event routing and net envelope.
- `src/domain/physicalContact.ts` — positive-impulse contact recognition for speculative rim rebounds.
- `src/scene/art.ts`, `src/scene/Net.tsx` — texture mapping and cheap net animation.
- `src/assets/hoop/{basketball,backboard,net,rim_front,rim_back}.png` — five existing art copies.
- `tests/audio.test.ts`, `tests/rewards.test.ts`, `tests/browser/rewards.spec.ts` — audio safety, envelopes and actual-input acceptance.
- `tests/physicalContact.test.ts` — real smaller-rim rebound with positive solver separation.
- `docs/presentation-pass.md` — this implementation/replacement record.
- `docs/verification/2026-10-19/polish-{ready,swish,pause-small}.png` — new visual evidence. Existing viewport/trajectory screenshots are refreshed by their browser cases.
- `docs/verification/2026-10-19/polish-browser-results.json` — final 19-case browser result report.

Refreshed existing screenshot files: `docs/verification/2026-10-19/trajectory-ready.png`, `trajectory-aiming.png`, `trajectory-flight.png`, `viewport-320x568.png`, `viewport-400x712.png`, `viewport-430x820.png`, `viewport-1280x800.png` (all under that same directory).

## Verification and next iteration

Verification results are recorded in [verification.md](verification.md). New checks cover locked/denied audio, bounded voices and stop behavior, original finite sound samples, one-shot rewards, collision debounce, net direction/settling, actual native-touch audio events, HUD reward text, pause and restart.

Final result: 36 prototype unit/physics tests, 19 Chrome acceptance cases, prototype build/lint, original 106 Phaser tests and original lint passed. The final browser suite ran with source held unchanged. Original code and package files are untouched.

Next: human listening on phone speakers/headphones to tune volume and swish character, a short feel check with the smaller hoop, and device load/performance measurement. The five uncompressed PNGs add about 7.18 MB of transfer; a texture compression/resizing pass is still worthwhile. Full UV-ready ball/net artwork would improve views from other angles, especially the mirrored hemisphere and projected net strands. The existing deferred spin-direction tuning remains separate. No new modes, best score, lives or menus are part of this pass.
