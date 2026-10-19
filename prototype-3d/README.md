# AFTER HOURS — 3D practice prototype

An isolated React/Three/Rapier experiment. The Phaser app in the parent folder remains independent.

```sh
cd prototype-3d
npm ci
npm run dev
```

Requires **Node.js 22+**, npm and a WebGL2-capable browser. Open http://localhost:5174, or the network address printed by Vite on a phone on the same Wi-Fi. There is no public deployment. The original game still runs independently from the parent folder on its usual port.

Start near the ball, swipe upward and release. Normal swipes are forgiving; swipe farther for more range, shorter for less, and sideways to change aim. Speed does not change launch power. Taps, downward swipes and cancelled touches do not count. There is no timer, lives limit or game-over screen. Use ↻ to start a fresh practice; Ⅱ pauses. Returning from the background requires Continue shooting.

A faint dotted arc shows the baseline shot while ready. During a swipe it brightens and follows the same launch calculation used on release, stopping at the first predicted rim/board/floor contact. It previews free flight, not bounce outcomes or a guaranteed basket. After release, a short shrinking trail follows actual physics samples, including rebounds. Pausing hides both; restarting clears the old trail.

The current presentation uses the supplied hoop/ball/net art on 3D geometry, a slightly smaller physical rim (0.232 m inner radius, 0.017 m tube), and a 280 ms visual net pull on confirmed makes. Sound unlocks when starting a shot: a soft release, metal rim, lower glass knock, clean swish or restrained make tone. Pause/restart stops current audio; unavailable audio never blocks shooting. See [presentation pass](docs/presentation-pass.md) for exact files, event wiring, asset replacement and remaining work.

## First human playtest

Take a few familiarization shots, then shoot 20–30 times naturally without interruption. Try small horizontal variations and shorter/longer swipes. Note whether misses are understandable, whether front/back-rim contacts look believable, and whether you want to retry. In development, expand **Session log** to copy JSON; a download is offered if the clipboard is unavailable. Restart clears the current log, so export first.

The provisional 50–70% target applies to human play after familiarization. Automated tests demonstrate reproducible controls and physical passage, and do not establish human enjoyment or make rate. No phone hardware performance claim has been made.

## Commands and tuning

```sh
npm test              # Pure logic and actual Rapier integration
npm run lint
npm run build         # TypeScript and production bundle
npm run preview       # http://localhost:4174
npm run test:browser  # Installed Google Chrome; builds dist first with npm run build
node scripts/capture-shots.mjs # Dev server running on 5174; records native touch inputs
```

The browser suite starts or reuses both local servers. Recordings need Playwright's FFmpeg (`npx playwright install ffmpeg` if missing). No browser tests set scores or teleport balls.

Tuning lives in `src/config.ts`: gravity/step, ball size/mass/bounce, shared rim dimensions, board geometry, camera, power band, horizontal forgiveness and recovery. Defaults use a 20–40% viewport-height power band with a continuous low-sensitivity response, not one exact swipe distance. Launch velocity is solved against the actual world displacement. Rapier owns movement and collisions after release; the ball is never steered into the basket.

The DEV-only, read-only `window.afterHours3D` inspection interface exports actual samples, contacts and ordered scoring crossings. `?automation` tags automated sessions. Production has neither this interface nor the log UI. The last 100 shots are retained, with bounded sample/contact buffers. Normal counters remain unlimited.

## Scope and evidence

The prototype retains a simple court and unlimited practice. Arcade lives, best score and game-over rules remain deferred. See [verification](docs/verification.md) for results, recordings and limits, and [provenance](docs/licenses.md) for asset/licensing notes.

Root `vitest.config.ts` scopes the Phaser tests to their original src/tests directory so its npm test never loads this separately installed app. No original game source, dependency or lockfile was changed.
