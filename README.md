# AFTER HOURS ↗

A mobile-first, single-player basketball game. Built with TypeScript, Vite, Phaser 3 and Matter. A cinematic local night-court backdrop, procedural textured basketball, self-hosted fonts, no backend or accounts.

## Run locally

Requires Node.js 20.10+ and npm.

```sh
npm install
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173). Open this folder in VS Code. To play on a phone on the same Wi-Fi, use the network URL printed by Vite. The dev server listens on the local network; it is not an internet deployment.

```sh
npm test             # Pure rules plus bundled Matter integration tests
npm run build        # Strict TypeScript check and production build
npm run preview      # Serve the production build
npm run lint
npm run format:check
npm run format
```

## Controls

Touch or click near the basketball, drag **upward in the direction of the shot**, and release. More drag means more power. The dotted line previews the beginning of the flight. Only one ball is active at a time. A tap, downward drag or cancelled touch does not consume a shot.

Use the pause button or Escape to pause. Backgrounding the tab pauses the run. Resume explicitly when you return. A completed target secures your pass; keep shooting with the remaining balls for more stars.

## Current features

- Main menu, ten data-defined courts, level selection and locked progression.
- Fixed-step Matter ball, rim/backboard/ground collisions, short aiming preview.
- Directional swept basket detector; normal 2 / swish 3 / perfect 4 points.
- Stars at 100%, 120%, and 140% of the target. Final shots resolve before results.
- Replayable coin rewards and four equipment categories, each with five levels.
- Central equipment stat calculation; upgrades never aim the ball for the player.
- Versioned local saves; invalid or unavailable storage displays a warning.
- Responsive portrait court, safe-area-aware shell and DOM menus/HUD.
- Score feedback, net reaction, particles, optional synthesized sound, future haptics adapter.

Perfect means a clean basket that also meets a narrow spatial and entry-angle tolerance. It is not a timing minigame. Combo feedback tracks consecutive makes; bonus combo points are disabled for initial balancing.

## Architecture

- `src/domain/`: framework-independent scoring, level state, launch mapping, progression and purchases.
- `src/data/`: balancing data for levels, equipment, economy, scoring and physics.
- `src/game/physics/`: Matter court and ball; no progression rules.
- `src/game/input/`: pointer tracking, cancellation and aiming preview.
- `src/game/scenes/`: Phaser scene lifecycle and orchestration.
- `src/game/ui/`: responsive HTML/CSS screen helpers.
- `src/game/systems/`: original court art, textures and transient feedback.
- `src/app/`: connects scene actions, progress and service adapters.
- `src/services/`: storage, audio and haptics boundaries.
- `src/tests/`: rule regressions and actual Phaser-bundled Matter simulations.

Only physical state lives in Matter. Rules own scores and progression. UI and animation never award points on their own. Menu UI uses native buttons and local fonts. Scene listeners are removed on shutdown.

## Local saves

Progress is stored under `afterhours.progress.v1` in localStorage. Saves are specific to browser and origin; `localhost` and the LAN IP have separate saves. Successful replays earn coins again, but one run cannot claim its reward twice. Failed levels earn no coins. Mid-run shots are not saved. Storage failures allow the current in-memory session to continue with a visible warning. A save from a future version is not overwritten.

Cloud synchronization will need an explicit conflict policy, not just a replacement storage adapter. None is included in this MVP.

## Browser verification

Start `npm run dev`, then use the scripts under `scripts/`. They use Playwright with installed Google Chrome (`channel: 'chrome'`) and create screenshots in ignored `test-results/`. The `?debug` URL exposes a development-only inspection object, `window.afterHours`; production builds do not expose it.

Browser emulation is useful for touch and layout checks but is not a substitute for real iPhone/Android playtesting.

With the development server running in another terminal:

```sh
npm run test:browser
```

This verifies actual mouse and touch shots, a full successful run, a full failed run, final-shot resolution, pause/restart/exit, upgrades, and progress after reload. It requires Google Chrome installed locally.

## Next steps

1. Play the shooting prototype on real phones and tune power, gravity and reset timing based on feel.
2. Adjust the ten-level difficulty curve and coin economy from actual play sessions.
3. Replace synthesized audio if desired; keep the original geometric art until the gameplay is validated.
4. Only after the core loop is proven, evaluate Capacitor and native haptics. Accounts, cloud saves, ads and purchases remain out of scope.

Vite may report the Phaser vendor chunk above 500 kB. The engine is split into its own cacheable bundle; no extra UI framework is shipped.

## Visual milestone 1

Home and live gameplay now use a shared navy/teal, mint, cream and amber theme with a night-court environment, compact HUD and painted scoring feedback. Physics, input, scoring and saves are unchanged. See `docs/visual-redesign-2026-10-14.md` for visual modules and verification. Equipment, level-select and result layouts remain for a later pass.

Run `node scripts/visual-check.mjs` with Vite running to capture home, game, aim and score previews at phone sizes.

## Front-facing shooting update

The gameplay hoop now uses `src/assets/hoop/hoop-board.png`, with the rim aligned to the screen centre in all ten levels. The ball starts at bottom-centre. Drag upward for power; left/right deviation changes the shot direction at a reduced sensitivity suitable for the front view. Short shots and inaccurate shots still miss.

`src/data/hoop.ts` defines the image's measured rim anchor and collision dimensions. The front/back image layers give the falling ball correct net occlusion. The physics radius, domain scoring rules, upgrade economy and save schema remain unchanged. Shot positions and the horizontal drag sensitivity have intentionally changed for the new viewpoint.

## Controlled shot feel — checkpoint 1

The primary shot now uses a deterministic 2.5D trajectory rather than Matter gravity. `src/data/shotFeel.ts` configures timing, aim/power, arc, scale, rotation, preview and shape changes. `ShotTrajectory` owns pure sampling/arrival assessment; `ShotController` owns progress; `TrajectoryPreview` and `BallAnimator` render that same plan. Matter resumes only after the ball reaches hoop depth, for residual bounces.

An ideal upward drag remains 146 logical units. Horizontal drag controls the lateral endpoint. Power independently changes depth and arc; weak, strong and off-centre shots can miss. Score is assessed once at hoop depth with clearance and downward-entry checks, using the existing 2/3/4-point rules. Earlier screen-plane crossings never award points. Normal duration starts at 880ms, with a configurable small power-dependent variation. Scale reduces smoothly to 45%; backspin is around two rotations. Aim compression and release stretch last at most 100ms.

Start Vite, then run `npm run test:shot-feel` for actual input, animation measurements, miss cases, pause and a recording. It uses Chrome plus Playwright's FFmpeg (`npx playwright install ffmpeg` if absent). The older Matter trajectory tests remain adapter regression coverage; they do not validate the new primary shot.

This checkpoint deliberately stops after the first five requested steps for player review. Ghost trails, differentiated hoop reactions, full net stretch/swing, camera motion, hit-stop and new ambient effects are the next checkpoint. Existing score/impact feedback is retained.
