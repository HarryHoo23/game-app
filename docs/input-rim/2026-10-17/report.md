# Input + canonical rim P0 checkpoint — 2026-10-17

Work stayed on `feat/basketball-mvp`. `git pull --ff-only origin feat/basketball-mvp` reported already up to date at the requested baseline `2a17ce63a12bc7d878cf787e0aeaa1f4bbb67374`. No original artwork, physical hoop dimensions, score rules, equipment stats, trajectory apex/timing, feedback choreography or replay cadence were changed.

## Root causes and mapping

1. `hypot(dx,dy)` increased power when a vertical swipe drifted sideways. Linear `dx/100*130` also penalized drift twice. Release used a preview smoothing accumulator, so equipment smoothing made the same endpoints depend on pointer sampling frequency.
2. `rim_back.png` is already a complete oval; `rim_front.png` is an unrelated generated arc. Different widths, anchors and flipping could not reconstruct one oval.

| Input | Before | After |
|---|---|---|
| Base power | clamp(hypot(dx,dy)/170,0,1) | clamp(max(0,-dy)/170,0,1) |
| Normalized aim | clamp(dx/100,-1,1) | sign(dx) × clamp((abs(dx)−8)/50,0,1)^1.5 |
| Horizontal range | ±130 logical px | ±130 logical px |
| Release | smoothed preview accumulator | actual raw start/end points |
| Equipment smoothing | affected release | affects preview only |

Equipment power-control still blends raw power toward ideal `146/170 = 0.858824`; it was not changed. Minimum vertical release is 18px. Weak and overpowered releases still miss. At base equipment, any dx has identical power for the same dy. At dy −146: dx8 maps to 0 target displacement, dx15 to 6.810px (previously19.5), dx25 to25.774px (previously32.5). Aim saturates at |dx|58. No automatic target placement, collision inflation or scoring tolerance changes.

## Identical seeded comparison

1,000 Court01 shots, base equipment, seed `0x4f18`. Centered triangular dx −25..25, vertical travel125..170 centered147.5, starts within ±24x/±12y of the visible ball. Same exact gestures BEFORE/AFTER. Harness domain evaluation is invariant to translated starts; browser checks separately exercise different starts and actual pointer events. A predicted make only counts after the complete ordered `HoopPass` reaches EXIT.

| % of all1,000 gestures | Before | After |
|---|---:|---:|
| Make total |52.2|75.8|
| Normal make |20.6|19.4|
| Swish |20.4|31.5|
| Perfect |11.2|24.9|
| Front-rim miss |17.1|7.4|
| Back-rim miss |30.7|16.8|
| Backboard miss |0|0|
| Airball |0|0|

These are **simulated input mapping outcomes**, not measured human success rates. Miss categories here are domain predictions, not later Matter collision telemetry. Browser debug records actual contacts separately. The original baseline already met the suggested aggregate45–60% band; its problem was center drift and coupled control, not a low result on this bounded distribution. The new75.8% make and24.9% perfect exceed the initial guidance. No counts were hardcoded or sensors enlarged to hit a rate. An exploratory aim-drag sweep35/38/40/42/50 produced69.1/70.5/71.9/73.0/75.8% predicted makes; the50px response was retained for its more forgiving central interpretation while ±25px ideal-power swipes still miss. More varied real touch gestures are needed before final balance acceptance.

- Raw data: [before-humanized.json](before-humanized.json), [after-humanized.json](after-humanized.json).
- Reproduce: `./node_modules/.bin/vite-node scripts/humanized-input-check.ts /tmp/after-humanized.json`.

## Browser and interactive play

Actual Chrome pointer events (no injected plans or scores):

| Gesture, logical px | Result |
|---|---|
| dx0,dy−146 | PERFECT +4 |
| dx+8 / −8,dy−146 | PERFECT +4 both |
| dx+15 / −15,dy−146 | SWISH +3 both |
| dx+25 / −25,dy−146 | Front-rim misses both |
| dx38,dy−146 | Miss |
| dx0,dy−85 | Underpowered airball |
| dx0,dy−210 | Overpowered back-rim miss |

A separate actual-browser test varied move events5/12/30 with the same endpoints and diagnostic smoothing0.45: final plans were identical. This smoothing override is test-local, does not modify saved equipment, and deliberately exercises a stronger preview smoothing than current equipment.

Also performed six visual, coordinate-selected drag interactions through the in-app browser, independently of the exact-vector script. At the observed429px-wide court: right drift [292,715]→[306,558] and left drift [305,715]→[290,556] each scored4. After a development reload, near-vertical [300,715]→[302,562] scored4; moderate diagonal [302,715]→[342,559], weak [301,714]→[304,621], and strong [298,714]→[300,488] each scored0. Sweet spot was discoverable without copying dx0,dy−146. These are agent-operated mouse interactions, **not a human participant or a physical phone-finger study**.

DEV-only practice URL: `http://localhost:5173/?debugInput`. After a shot, `window.__inputDebug.shots` retains the last25 releases and logs tables; `window.__inputDebug.clear()` clears them. Records contain raw endpoints/deltas, verticalDrag, mappedPower/aim, targets, arrival errors, predicted contact, actual final contact, quality and score. Ordered EXIT or miss resolution finalizes the score; later physical contacts update impact. Built production JS removes these hooks and globals even with `?debug&debugInput`.

Video: [human-input.webm](human-input.webm). Runtime records: [browser-results.json](browser-results.json).

## Source diagnosis and rim architecture

All four PNG canvases are1254×1254. At alpha≥128, solid bounds are:

- rim_back: (34,399)–(1220,907), complete oval with both arcs/endpoints, consistent tube thickness/light and a lower mounting plate.
- rim_front: (11,500)–(1242,720), an independent upper arc with different perspective, endpoints, thickness and lighting. Flipping it made a second shape.
- net: (63,123)–(1191,1106), curved top loops; center highest, sides lower.
- backboard: (22,269)–(1231,976).

Low-alpha speckles extend outside these solid bounds. Originals remain untouched, including the retired front image.

`canonicalRim` centralizes the full source crop (31,397,1193,514), width104, shared origin(.5,.35), and front cutoff at crop-localY180. Both instances share the **same texture and same aligned frame**, identical x/y/scale/origin/rotation. The front instance uses Phaser `setCrop` only on the near half; the crop does not reposition or resize the source geometry. It cannot draw another complete oval.

Outer assembly retains master scale0.73 and its existing position. A single nested `rimContainer` owns rear/full rim, ball, net and cropped front, so local display-list order can interleave: rear3 → ball4 at rim/in net → net5 → front6; foreground ball7. Backboard2 is sorted before this group. Browser inspection caught and fixed an initial outer-container order error; a regression now asserts the actual outer child order.

Only `rimContainer` is tweened for impact. Translation is in outer-parent units; its own source-pixel scale does not multiply its translation. Measured world shake peaked at1.095px, preserving the previous subtle response. Ball placement uses the full inverse world matrix and world scale, so changing assembly scale or vibrating the rim cannot drag or resize the ball. Canonical copies stay locked through hit, reset, position/scale changes.

The net's highest central loop attaches to the canonical rear inner underside at sourceY490; its local top derives from that point and the shared source transform (assembly offset≈−7.56), rather than a separate eye-tuned Y. Side loops follow the curved top and the front arc covers their near attachments. Idle and entry captures show one ellipse, attached net and working front/net occlusion.

## Captures

Screenshots freeze **naturally reached runtime frames** via a diagnostic scene pause; no ball pose or score is injected. This prevents screenshot latency skipping the short rim passage. The representative video runs continuously without these pauses.

- [Idle full scene](01-idle.png) / [hoop close-up](01-idle-hoop-closeup.png)
- [Ball above rim](02-above-rim.png)
- [Ball entering rim](03-entering-rim.png)
- [Ball inside net](04-inside-net.png)
- [Rim hit](05-rim-hit.png)
- [Reset](06-reset.png)

## Verification

- `npm test`:88/88 passed, including ordered sensors, impact responses, trajectory, power separation, curve symmetry/monotonicity/deadzone/cap, weak/strong/side misses, endpoint sampling, seeded stability, telemetry lifecycle, canonical source/transform/crop, shared hit parent, reset/net attachment and display-list ordering.
- `npm run lint`: passed.
- `npm run test:browser`: passed all existing physics/lifecycle/mobile/campaign/failure scripts, including CDP touch cancel and touch basket, scene restart, small viewport pause, complete10-shot run and retry. These remain automated browser checks, not physical touch-device acceptance.
- Source/new-harness Prettier checks and `git diff --check`: passed.
- `npm run build`: passed; existing Phaser chunk-size advisory remains.
- `node scripts/input-rim-check.mjs`: passed actual gesture set, sampling invariance, six captures, no pre-EXIT score, actual depth ordering, shared matrices during hit and scale/reset, exact net restore, no page errors.
- `node scripts/production-input-check.mjs`: passed built-JS absence checks, no debug globals with query flags, actual production shot scores4. [Result](production-check.json).
- `node scripts/perspective-check.mjs`: passed board40–46%viewport, foreground cropping, canonical center, near-rim size ratio≈0.418, grouped parenting and reset.
- `node scripts/layered-hoop-check.mjs`: passed front/net depth, deferred EXIT, net stretch/exact reset, PERFECT4/rimMAKE2/SWISH3, in-net pause/resume.
- `node scripts/shot-checkpoint-check.mjs`: passed scoring order, no reentrant launch, in-net pause, exact net restore, pooled trail hidden in net/idle, physical backboard miss.
- `npm run test:shot-feel`: passed800ms flight, squash/stretch, shrinking/backspin, weak/strong/side misses and paused progress.

Existing browser size assertions now use full world matrices rather than assuming one parent. The rim-contact regression uses dx20 instead of10 under the new aim curve; the physical backboard example uses dx46 instead of65. Outcome assertions remain; they were not removed. Layered browser verification now records every frame rather than waiting through screenshots and accidentally skipping the≈100ms pass.

## Exact changed files

Runtime:
`src/data/shotFeel.ts`, `src/domain/shooting/ShotTrajectory.ts`, `src/game/input/shotGesture.ts` (new), `src/game/input/shotInput.ts`, `src/game/input/inputDebug.ts` (new), `src/game/scenes/GameScene.ts`, `src/game/hoop/hoopLayout.ts`, `src/game/hoop/HoopRenderer.ts`, `src/game/assets/manifest.ts`, `src/game/scenes/menus.ts` (deduplicate the canonical texture preload).

Tests/harness:
`src/tests/humanInput.test.ts`, `src/tests/inputDebug.test.ts`, `src/tests/canonicalRim.test.ts` (all new); `scripts/lib/humanized.ts`, `scripts/humanized-input-check.ts`, `scripts/input-rim-check.mjs`, `scripts/production-input-check.mjs` (new); `scripts/perspective-check.mjs`, `scripts/layered-hoop-check.mjs`, `scripts/shot-checkpoint-check.mjs`, `scripts/shot-feel-check.mjs` (updated).

Evidence/report: every file within `docs/input-rim/2026-10-17/`.

## Remaining weaknesses

- Physical touch acceptance on Safari/60Hz/120Hz phones remains unverified. Endpoint invariance is covered, but it does not prove first-time-player feel.
- This bounded triangular distribution overproduces PERFECT relative to the initial guidance. Real swipe distributions should drive subsequent balance decisions; no new balancing features were introduced here.
- PNG alpha speckles, the source mounting plate and existing net art remain. The net is still a subtly deformed2D sprite, not simulated mesh cloth. The separated incompatible front asset remains on disk but is not loaded for gameplay.
- Existing physics/scoring uses domain arrival classification plus ordered sensors and Matter miss contacts. No broader physics rewrite was undertaken.
