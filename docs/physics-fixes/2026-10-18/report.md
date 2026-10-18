# Two evidenced physics fixes — 2026-10-18

Implemented only the backboard callback unit fix and safe controlled-to-Matter handoffs on `feat/basketball-mvp`. Initial HEAD matched `45271cf59d490e04904b382c73eaac32c7ca1abc`; pull was already up to date. The physics audit report was read before edits. No physics-engine migration, contact-radius retuning, new rim geometry, progression changes or visual polish.

## Separate implementation commits

- `554b052` — backboard collision callback velocity-unit fix, with baseline recordings/traces and isolated after-board reproduction.
- `26ced8f` — safe handoff implementation and after evidence. This commit appeared in the shared checkout while the task was in progress; it already contained the pending second-fix files. It was preserved rather than amended or duplicated. It also includes three previously regenerated input/rim media files. Those are test output, not gameplay changes.

A final documentation/verification commit records this report and comparison; implementation commits remain separate. Nothing was pushed by this task.

## Fix 1: let Matter solve ordinary backboard collisions

`GameScene.respondToMiss()` no longer reads raw `body.velocity` and writes it through `setVelocity()` for a backboard collision. That callback occurs before Matter's120Hz step displacement is normalized into60Hz velocity. Its previous redundant assignment halved the input velocity.

The existing impact sound/feedback call and miss resolution are retained. This is not a compensation multiplier and does not bypass the solver. Actual engine contacts also no longer receive a separate scripted rim velocity assignment; the real solver owns their physical response. Height-gated center front/back cases without a real engine contact retain their existing scripted response for the next checkpoint.

Reproduction: real pointer start(200,674), end(246,529),12move events, base equipment/Court01.

| dx46,dy−145 | Before | After |
|---|---:|---:|
| First board collision |908.33ms|908.33ms|
| First post-solver vx |0.14727|0.38783|
| First post-solver vy |3.48207|6.90417|
| Final score |0|0|
| Miss resolutions |1|1|

The first board feedback remains. An additional former secondary board bounce disappears because the restored outgoing trajectory differs; feedback is not artificially replayed to match the former contact count.

[Before video](before/backboard.webm) · [after-board video](after-board/backboard.webm) · [final after video](after/backboard.webm). Same-named JSON files contain raw/normalized incoming velocity, actual supports and post-solver velocity.

## Fix 2: safe late handoff, without teleporting or foreground Matter

A small `SafeHandoff` helper works against the actual Matter rim/frame vertices and bounds. The physical ball radius remains14; the conservative circular envelope is used against Matter's polygonal body surfaces, with0.01logical px clearance. The existing shape bounds include the side-frame half thickness3.5; expanded observation bounds are x68.5..331.5 and bottom314 on Court01.

Only predicted misses are checked during the existing late approach window `t>=0.9`. Made candidates preserve the entire original controlled trajectory, HoopPass and TOP→CENTER→EXIT. No physical contact is enabled during foreground motion.

For a **new contact entered in the eligible window**, each fixed-step segment is subdivided and the first blocked interval bisected. The controller ends at a safe point on the original rendered path. Position and derivative are expressed in the existing fixed court coordinates before Matter takes over. This avoids an early-handoff perspective jump; it does not displace the ball to an arbitrary nonoverlapping location. The approach curve, apex, input and plan are unchanged up to physical contact.

For a **shape already occupied at the eligibility boundary**, rewinding to the earlier crossing would teleport the displayed ball backwards and collide during a depth-ineligible phase. Instead, if still overlapping at normal arrival, the ball remains static/mask0 and continues smoothly with its existing velocity/rotation and configured Matter gravity until fully clear. Only then are dynamic collisions enabled. No height impulse or delayed physical bounce is invented for that already occupied shape. This is intentionally a deferred handoff, not a reconstruction of the missing front/rear arc physics.

Swept/deferred miss routes use a physical-only miss gate: they cannot also fire the height-based scripted response. A real collision triggers existing feedback and one resolution while the Matter solver handles its velocity. Secondary distinct physical contacts remain allowed; they are not duplicate impulse applications for the initial hit.

| Reproduction | Before | After |
|---|---|---|
| dx38,dy−125 |Handoff825ms, overlap9.385px; scripted front impulse then actual rim pair|Handoff783.33ms, separation0.010px; first rim pair791.67ms; no scripted impulse|
| dx80,dy−146 |Handoff800ms, overlap1.5px; immediate MISS then late board pair808.33ms|Arrival remains800ms; collision-disabled continuation2steps; safe handoff816.67ms, separation1.208px; no late board bounce|
| Both final scores/resolutions |0 / once|0 / once|

The earlier rim handoff is an intended collision boundary correction. The16.67ms board deferral is an intended safety interval. Existing450/600/675ms post-resolution cadence values were not retuned, so release-to-ready timing naturally changes with the corrected contact/resolve time.

- dx38: [before](before/rim-handoff.webm) / [after](after/rim-handoff.webm).
- dx80: [before](before/board-handoff.webm) / [after](after/board-handoff.webm).
- [Combined comparison and source hashes](comparison.json).
- [Eight-case after audit with overlay-on/off parity](audit-after/summary.json), plus individual videos/screenshots/traces under `audit-after/cases/`.

Recordings use real browser mouse gestures; no injected ShotPlan, score writes or fabricated ball poses. The three focused videos run continuously. The broader audit videos pause a naturally reached scene frame briefly for screenshots, as documented by the original audit harness. Desktop Chrome400×712; these are not a physical phone study or audio recordings.

## Preserved behavior

The three focused BEFORE/AFTER ShotPlans match exactly. Source hashes verify twelve relevant source files are byte-identical to the expected initial HEAD, including ShotTrajectory, shotFeel, perspective, input, HoopSensors/HoopPass, canonical hoop renderer/layout, impact/cadence configuration, BallAnimator and feedback adapter. Scoring rules and progression were not changed. Clean swish and rim MAKE still score3/2 only after ordered EXIT; ideal PERFECT remains4. Visual apex and perspective remain as configured. The only primary miss-motion interruption is a genuine late eligible physical contact.

## Validation

- Test-first regressions were observed failing before each fix: backboard post-solver velocity3.48 failed the normalized-speed assertion; missing safe-handoff helper and physical-only/full-frame bounds behavior failed before implementation.
- `npm test`:99/99pass, including5new safe-handoff tests and2new impact-gate tests. Tests cover frame thickness, disabled foreground interval, same-path first eligible contact, already-overlapping deferral with continuous movement, projected derivative continuity, no height impulse in physical-only mode and bounds clearance.
- `npm run lint`, `npm run build`, `npm run format:check`, `git diff --check`:pass. Existing Phaser vendor chunk-size advisory remains.
- `npm run test:browser`:all5scripts pass: body contract; lifecycle; mobile touch/cancel/pause; real10-shot campaign/reload; failed-run/retry.
- `perspective-check.mjs`, `layered-hoop-check.mjs`, `shot-checkpoint-check.mjs`, `test:shot-feel`:pass. Covers canonical grouping and foreground crop;0.418near-rim ratio; exact net restoration; PERFECT4/rimMAKE2/SWISH3; EXIT scoring, no reentrant launch, pause/resume, physical board contact;800ms ideal flight/backspin and bad-gesture misses.
- `input-rim-check.mjs`:passed10real pointer inputs, 5/12/30endpoint invariance, canonical transform locking and net/front occlusion during this checkpoint. It regenerated earlier media, included in the shared-checkout second commit as noted above.
- `physics-fixes-check.mjs before`, `after-board`, `after`:captures and assertions for all3requested inputs; board speed restored, one MISS, nonpenetrating handoffs, no height impulse on corrected routes, expected first real rim contact and safe board deferral.
- `physics-audit-check.mjs`:all8cases and diagnostic-on/off plan/handoff/velocity/outcome parity pass with updated assertions for intentionally corrected cases. It now writes `audit-after`, leaving original audit baseline evidence intact; optional runtime wrapper forwards the physical-contact flag.
- Production checks: diagnostic strings/globals absent from built JS even with query flags; actual production swish3 and PERFECT4 still work. Copies of verification JSON are saved under `verification/`.

## Exact implementation files

Fix1: `src/game/scenes/GameScene.ts`; focused browser harness and before/after-board evidence.

Fix2: `src/game/physics/SafeHandoff.ts` (new); `src/game/physics/court.ts`; `src/domain/shooting/ShotController.ts` (`finishAt` only); `src/domain/shooting/ImpactResponse.ts` (actual bounds/physical-only gate); `src/game/scenes/GameScene.ts` (late sweep/deferred integration/engine-owned collision response); `src/domain/geometry/polygon.ts` (existing observer geometry extracted for runtime reuse); `src/game/debug/auditGeometry.ts` (re-export); `src/game/debug/PhysicsAudit.ts` (pending handoff phase/velocity display); corresponding tests and browser assertions/evidence.

## Remaining next-checkpoint issues

1. Contact radius remains inconsistent: Matter14logical /10.22screen versus visible solid radius≈25.18screen and scoring32.4logical. No radius inflation or clearance-rule changes were made.
2. Physical rim remains two endpoint circles, not the canonical art's front/rear arcs. Centered front/back misses still use height-only scripted responses, and contact-qualified makes retain their current deterministic classification/centering. Rebuilding this geometry was explicitly excluded.
3. Board collider/art offsets and absent face/bottom collider remain. The fix uses current actual body geometry; it does not redesign it.
4. Deferred overlap clearance deliberately does not produce a collision for a shape already occupied during depth-ineligible flight. A future unified contact-space profile should remove that ambiguity. The finite sweep is for short fixed-step late approach segments, not general high-speed continuous collision detection.
5. Residual ground restitution/high post-net speed and landing appearance remain unchanged.

Stop here: these two direct fixes are implemented and recorded; no further physics or polish work is included.
