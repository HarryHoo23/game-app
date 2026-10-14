# Layered hoop integration

Scope: four supplied PNG layers, canonical hoop coordinates, visible continuous net passage and differentiated shooting feedback. No unrelated gameplay/UI/progression work.

- `src/game/hoop/hoopLayout.ts`: relative layer anchors and trims, aspect-preserving widths, depths, sensor offsets and motion settings. Independently generated transparent canvas margins are handled with Phaser texture frames; original PNGs remain unchanged. The near rim arc uses vertical flip to face the player.
- `HoopRenderer`: owns four sprites, alignment/debug drawing, exact animation baselines and reset. Gameplay no longer loads the flattened hoop; the old PNG remains on disk.
- `HoopSensors`: swept top→centre→exit crossings, downward motion and aperture checks, independent rim/backboard contact flags and single award. Invalid upward/side/underside passages do not score.
- `HoopPass`: smooth continuation of position, velocity, rotation and perspective scale after the roughly 900ms approach. Top crossings during the final approach are carried forward; rim-contact candidates receive continuous lateral deflection. Points arrive after visible exit, before handoff to Matter bounce.
- `BallAnimator`: explicit APPROACHING/AT_RIM/IN_NET/BELOW_HOOP depths. Rear rim behind ball; front rim and net above it while entering; normal foreground after exit.
- Centre entry triggers top-origin net stretch with subtle sway and exact baseline restoration. Rim layers vibrate together. Exit feedback differentiates PERFECT +4, SWISH +3 and MAKE +2, including optional synthesized audio, mint particles/camera punch and existing native haptic adapter hooks.

Development alignment view: `http://localhost:5173/?debug&debugHoop`. Production builds omit the debug overlay.

Verification: 64 unit tests; TypeScript/Vite build, ESLint and Prettier; real-input layered hoop test covering occlusion, exit-only scoring, net stretch/reset, rim make, lighter swish and in-net pause/resume; existing mobile, lifecycle, campaign and failed-run browser checks. Independent review scanned 19,120 accepted trajectories across ten existing levels, all completing ordered sensors.

Screenshots and recording: `docs/visuals/layered-hoop-{at-rim,in-net,below}.png`, `docs/visuals/layered-hoop.webm`. Browser checks: `node scripts/layered-hoop-check.mjs`, `npm run test:shot-feel`, `npm run test:browser`.
