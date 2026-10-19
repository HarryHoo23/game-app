# Endless Hoops MVP — 2026-10-20

Started from reviewed HEAD **969922972edd0a5d2a608b6a2502695d9272c2e8** on `feat/3d-basketball-prototype`, with a clean working tree. Final commit IDs are provided in the delivery message.

## Play in a browser

From `prototype-3d/`, run `npm run dev` (Node 22+, existing dependencies installed).

- **Endless:** http://localhost:5174/ or http://localhost:5174/?mode=endless. The ball is ready immediately. Each confirmed basket adds one point. Three resolved misses end the run. The result screen shows Score, Best Score and **Retry**; one tap prepares the next run, retaining Best.
- **Practice:** http://localhost:5174/?mode=practice, **Practice ↗** under the title, or **Unlimited Practice** on Game Over. Practice keeps unlimited attempts and never changes the Endless best. **Endless ↗** returns to the arcade loop. Mode switches start a fresh session and update the URL.
- The two-line first-time hint is non-blocking and disappears after the first accepted release. It is remembered locally. Taps, invalid swipes and cancellations do not consume a chance or dismiss it.
- Pause/Continue, mute and restart retain the existing controls. In DEV, Session log remains accessible at Game Over. Export before Retry/restart/mode switch: the next session clears the current log. Download fallback uses `after-hours-endless.json` or `after-hours-practice.json`.

For production, run `npm run build` then `npm run preview`; use the same paths on port **4174**. On a phone on the same Wi-Fi, use Vite's printed computer network address in place of localhost. Best/tutorial are local to that browser and origin. If storage access fails, play and retries still work with page-memory progress; persistence across reload is then unavailable.

## Rules and lifecycle

The existing store now owns mode, remaining chances, score and Best. The low-level Rapier scene does not count misses or implement the three-miss rule. It delivers the same authoritative result contract after real downward passage or retirement. Only `swish`, `rim-make` and `board-make` award a point; all resolved misses consume one chance in Endless.

Accepted events require the current session ID, current shot ID, the flying phase and an unresolved shot. Launch IDs must increase within a session. Duplicate results, previous shots and previous sessions are rejected before score/Best/feedback can change. `recordReady` only advances recovery; it cannot reopen a finished run. Pause cannot replace Game Over.

On the third miss, the store enters `gameover`, the input bridge rejects further shooting, and the existing ball lifecycle cancels its pending next-ball preparation. Resolved balls retain physical motion and bounded cleanup; no force, position correction or physics pause is introduced at Game Over. Net/audio gameplay events cannot be emitted from a rejected result. Existing visual settling continues, while later net passage is ignored for a finished run.

Retry and mode switching increment the session ID and recreate the existing ball session. Attempts, score, chances, current shot, resolution flag, feedback and pause state reset; old bodies, gesture capture, trail, net pulse, voices and DEV log are cleared through the existing reset path. Court, art, AudioContext and cached textures are reused. Best and learned tutorial status remain player progress.

`src/domain/playerProgress.ts` is a small storage adapter. It validates non-negative safe integer scores, never lowers the highest observed score, saves on confirmed Endless makes, and catches getter/read/write failures. No backend, account, dependency or asset was added.

## Verification and evidence

[Open the recording and portrait screenshots](verification/endless-2026-10-20/review.html). Run the dev server and open `/docs/verification/endless-2026-10-20/review.html`.

The complete recording uses native touch input for two swishes and three rim misses, then a native Retry tap and another real swish. Scores, run state, body transforms, clock and storage are not injected. The original game audio is copied to MediaRecorder for capture only. [Run trace](verification/endless-2026-10-20/run-trace.json) preserves the finished session before Retry, the new session, actual contacts/crossings, state transitions, launch vectors and retry readiness measurement. The source manifest records the exact captured runtime.

The first clean make matches the accepted 9699229 recording: identical launch and outcome, **38 corresponding physical samples with zero position deviation**. Entry audio remains at 1.183 s and confirmed swish at 1.250 s after release. Native Retry became ready in **87 ms** in this desktop capture, with one ball, zero score, three chances, retained Best, cleared feedback/voices and the same four art uploads. That single observed timing is not a phone performance guarantee. The 16.56 s video is paced by wall time with repeated frames at 25 fps; it is not a phone FPS or sample-accurate AV latency measurement. [Media/source verification](verification/endless-2026-10-20/checks/media-and-manifest.json) checks decoding/seeking and all 41 runtime hashes.

Final results: **51/51 unit/real-Rapier tests**, **35/35 browser cases**, ESLint, TypeScript/production build and art regeneration checks pass. Original Phaser **106/106 unit tests** pass. Results are linked from [verification](verification.md) and [check logs](verification/endless-2026-10-20/checks/). Unit coverage includes every make/miss result, duplicates, third-miss termination, blocked launches, stale sessions, immediate reset, persisted/corrupt/unavailable storage, first-time help, paused flights and 30-attempt Practice. Browser coverage includes the full touch-driven run, Game Over input rejection, compact-screen export/Retry, Best reload, mode switch during flight, unlimited Practice, pause/resize/restart, three portraits and production. Existing physical, net/audio, WebGL and 30-shot resource regressions remain.

One old compact-HUD assertion sampled the existing press-scale transition between layout reads. It now checks the unchanged 36px base CSS target and taps within the actual rendered bounds. No control appearance was changed to satisfy that test.

## Preserved scope and remaining limits

[Protected-file hashes](verification/endless-2026-10-20/checks/protected-files.json) verify that configuration, launch mapping, input/forgiveness, downward scoring, ball/rim/board/court/camera, materials, net feedback and audio code are unchanged from the reviewed baseline. Art regeneration still matches the original optimized materials. The original Phaser app and all package/lock files remain unchanged.

The existing spin-sign issue remains separate: `backspin: -7` produces forward X spin for negative-Z travel. It was not corrected in this milestone. No difficulty escalation, timers, moving basket, random launch errors or additional mechanics were added.

Physical iPhone/Android testing, subjective audio quality and whether short runs encourage retrying remain for human play. Desktop Chrome touch/viewport emulation is not a device performance claim. The existing large JavaScript bundle warning remains. Test a few natural Practice shots, play three Endless runs, verify Best after reload, Retry after the third miss, then pause/background/return and switch modes. Export any problematic session before resetting. The previous [phone checklist](mobile-acceptance.md) remains useful for the unchanged shooting/presentation.

## Changed files

All changes are under `prototype-3d/`.

- `src/store.ts`: shared run state, acceptance guards, score/chances/Best, mode and retry reset.
- `src/domain/playerProgress.ts`: safe Best/tutorial storage with memory fallback.
- `src/domain/practice.ts`: terminal lifecycle hook that cancels pending recovery.
- `src/scene/PracticeScene.tsx`, `src/App.tsx`: accept/reject event boundary, terminal input/readiness and additive read-only diagnostics.
- `src/ui/PracticeHud.tsx`, `src/ui/PauseOverlay.tsx`, `src/ui/styles.css`: mode access, Score/Best/chances, inline help, result screen and Retry in the existing design language.
- `tests/endless.test.ts`, `tests/browser/endless.spec.ts`: new rules/persistence and real-input coverage.
- Existing `tests/browser/{acceptance,integration,lifecycle,production,rewards,shooting,shotVisuals}.spec.ts`: explicit Practice URLs; compact-HUD timing assertion corrected as described above.
- `scripts/capture-endless.mjs`: reproducible genuine run recording with existing audio; `scripts/capture-{integration,shots}.mjs` explicitly retain Practice captures.
- `README.md`, `docs/verification.md`, this report and `docs/verification/endless-2026-10-20/`: browser instructions, results, media and evidence.

Stop at this playable MVP. The next decision follows human feedback.
