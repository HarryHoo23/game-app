# AFTER HOURS — Endless Hoops MVP

An isolated React/Three/Rapier experiment. The Phaser app in the parent folder remains independent.

```sh
cd prototype-3d
npm ci
npm run dev
```

Requires **Node.js 22+**, npm and a WebGL2-capable browser. Open http://localhost:5174, or the network address printed by Vite on a phone on the same Wi-Fi. There is no public deployment. The original game still runs independently from the parent folder on its usual port.

Start near the ball, swipe upward and release. Normal swipes are forgiving; swipe farther for more range, shorter for less, and sideways to change aim. Speed does not change launch power. Taps, downward swipes and cancelled touches do not count. The first valid release dismisses the short inline tutorial. Use ↻ for a fresh run/session; Ⅱ pauses. Returning from the background requires Continue shooting.

- **Endless Hoops:** open http://localhost:5174/ (or `?mode=endless`). Play immediately: +1 per confirmed basket, three resolved misses end the run. Game Over shows Score, Best Score and one-tap Retry. Best updates on confirmed Endless makes and persists in this browser/site; unavailable storage falls back to page memory.
- **Unlimited Practice:** tap **Practice ↗** under the title, choose **Unlimited Practice** after Game Over, or open http://localhost:5174/?mode=practice. No timer, miss limit or Game Over. Tap **Endless ↗** to return. Switching modes starts a fresh session.

A faint dotted arc shows the baseline shot while ready. During a swipe it brightens and follows the same launch calculation used on release, stopping at the first predicted rim/board/floor contact. It previews free flight, not bounce outcomes or a guaranteed basket. After release, a short shrinking trail follows actual physics samples, including rebounds. Pausing hides both; restarting clears the old trail.

The current presentation uses materials derived from the supplied hoop/ball/net art on 3D geometry, a physical rim of 0.232 m inner radius / 0.017 m tube, and a net that responds to actual descending passage before its 280 ms confirmed-make reward. Sound unlocks when starting a shot: soft release, metal rim, lower glass knock, a quiet entry brush and confirmed swish or restrained make tone. Pause/restart stops current audio; unavailable audio never blocks shooting. See [presentation pass](docs/presentation-pass.md) for exact files, event wiring, asset replacement and remaining work.

Current refinement: [image integration and swish report](docs/integration-pass.md), including before/after frames, three recordings with actual game audio, exact changed files, packed-art preparation and phone playtest instructions. Production art is about 0.515 MB; source PNGs remain editable. Use the small speaker button to mute/unmute; the preference survives reload.

Latest: [Endless MVP report](docs/endless-mvp.md), with the complete input-driven run, Game Over/Retry recording, state guards and verification. The previous [visual/mobile acceptance](docs/mobile-acceptance.md) retains its original three-size comparison, recordings and phone checklist.

## First human playtest

Choose Practice, take a few familiarization shots, then shoot 20–30 times naturally without interruption. Try small horizontal variations and shorter/longer swipes. Then switch to Endless and play a few short runs, checking three misses, Retry and saved Best. Note whether misses are understandable, whether front/back-rim contacts look believable, and whether you want to retry. In development, expand **Session log** to copy JSON, including at Game Over; a download is offered if the clipboard is unavailable. Restart clears the current log, so export first.

The provisional 50–70% target applies to human play after familiarization. Automated tests demonstrate reproducible controls and physical passage, and do not establish human enjoyment or make rate. No phone hardware performance claim has been made.

## Commands and tuning

```sh
npm test              # Pure logic and actual Rapier integration
npm run lint
npm run build         # TypeScript and production bundle
npm run preview       # http://localhost:4174
npm run test:browser  # Installed Google Chrome; run npm run build first
node scripts/capture-shots.mjs # Dev server running on 5174; records native touch inputs
node scripts/capture-endless.mjs # Complete Endless run + actual audio + Retry
```

The browser suite starts or reuses both local servers. Recordings need Playwright's FFmpeg (`npx playwright install ffmpeg` if missing). No browser tests set scores or teleport balls.

Tuning lives in `src/config.ts`: gravity/step, ball size/mass/bounce, shared rim dimensions, board geometry, camera, power band, horizontal forgiveness and recovery. Defaults use a 20–40% viewport-height power band with a continuous low-sensitivity response, not one exact swipe distance. Launch velocity is solved against the actual world displacement. Rapier owns movement and collisions after release; the ball is never steered into the basket.

The DEV-only, read-only `window.afterHours3D` inspection interface exports actual samples, contacts and ordered scoring crossings, plus mode, remaining chances and best. `?automation` tags automated sessions. Production has neither this interface nor the log UI. The last 100 shots are retained, with bounded sample/contact buffers. Practice counters remain unlimited.

## Scope and evidence

The prototype retains the existing court, art, audio, net and physics, with Unlimited Practice and the separate three-miss Endless loop. No timers, difficulty escalation, moving basket or random errors. See [verification](docs/verification.md) for results, recordings and limits, and [provenance](docs/licenses.md) for asset/licensing notes.

Root `vitest.config.ts` scopes the Phaser tests to their original src/tests directory so its npm test never loads this separately installed app. No original game source, dependency or lockfile was changed.
