# AFTER HOURS ↗

A mobile-first, single-player basketball game. Built with TypeScript, Vite, Phaser 3 and Matter. Original geometric court art, self-hosted fonts, no backend or accounts.

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
