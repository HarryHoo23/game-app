# Five-spot difficulty calibration

Branch: `feat/3d-basketball-prototype`. Exact starting HEAD: `434044a3bc7c9943775d8146b41f03e602370a81` (clean). The measured original configuration and all four experiment artifacts were recorded before changing runtime configuration. Final HEAD is supplied in the delivery message; [exact changed paths](verification/calibration-2026-10-20/delivery-files.txt).

The recommended candidate for human testing is **softBand 0.08 / softDepth 0.075, normalUp 0.30, rim 0.232 m**. This tightens edge gestures while preserving ordinary swipes. It is not a claim that human difficulty is now correct. The central test band still makes every shot, and the ballistic solver still derives a centred launch for a neutral swipe from every spot.

## What caused the ease?

The original soft band maps 20–40% upward swipes into only ±0.060 m of depth offset. The ball-centre scoring clearance is 0.232−0.120=0.112 m, and the shared launch solver adjusts the world velocity from each 4.2 m origin. All five angles therefore retain the same neutral swipe. Small lateral movement also has a 1.8% screen-width dead zone and a gentle nonlinear response. The idle ideal trajectory supplied a further visual reference. Its behavioural contribution has not been measured with humans.

The controlled grid attributes a much larger change to the gesture curve than to a 3 mm rim change: moderate mapping yields 116 fewer makes out of 975; the smaller rim alone yields only 3 fewer. These are paired experimental differences, not percentages of human ease. A smaller rim can also redirect a rebound into a make, so success need not decrease monotonically with its radius.

The current ball diameter is 0.240 m and opening diameter is 0.464 m (ratio 1.933). Reducing the opening to 0.458 m changes ball-centre clearance from 0.112 to 0.109 m, a 2.68% radial reduction. There is no visual evidence from this pass that warrants shrinking it. The delivered rim stays at 0.232 m, with tube radius 0.017 m.

## Reproducible real-physics study

Each configuration uses the identical ordered set of **975 shots**: five origins × 13 upward distances (0.18 through 0.42 in increments of 0.02) × 15 horizontal deviations (−.18, −.12, −.08, −.05, −.03, −.018, −.01, 0, .01, .018, .03, .05, .08, .12, .18). The viewport is 400×712; duration is 240 ms. Every cell has equal weight. This intentionally samples the forgiveness region and edges; it is not a measured or assumed distribution of human swipes.

A separately reported core subset uses up .22–.38 and |dx|≤.05: **81 shots per spot / 405 total**. Another 50 labelled edge probes cover short, long and lateral misses plus backboard interactions. They do not enter the 975-shot rates. All zero outcome categories are preserved.

The harness creates a fresh actual Rapier world per shot with the same gravity, 1/120 s step, mass, ball collider, capsule rim, board, floor, CCD, friction, restitution and oriented legacy spin. It sets velocities once, then steps Rapier. Contact manifolds use the same physical-contact predicate as the live scene. The original downward scoring and result/retirement contracts classify outcomes. Observation continues after resolution to reject duplicate scores. It records gestures, launch vectors, analytically mapped targets/local offsets, real contacts with before/after velocity, descending rim crossings, lower confirmations and score counts. Target predictions are diagnostics; contacts and points come from physics.

The four runs are a factorial comparison: original/current rim → moderate/current rim → original/small rim → moderate/small rim. No random samples or mid-flight intervention. [Summary JSON](verification/calibration-2026-10-20/summary.json), [original](verification/calibration-2026-10-20/original.json), [moderate](verification/calibration-2026-10-20/moderate.json), [rim-only](verification/calibration-2026-10-20/original-small-rim.json), [combined](verification/calibration-2026-10-20/moderate-small-rim.json).

From `prototype-3d/`:

```sh
CALIBRATION_STUDY=original npm test -- tests/sensitivityStudy.test.ts
CALIBRATION_STUDY=moderate npm test -- tests/sensitivityStudy.test.ts
CALIBRATION_STUDY=original-small-rim npm test -- tests/sensitivityStudy.test.ts
CALIBRATION_STUDY=moderate-small-rim npm test -- tests/sensitivityStudy.test.ts
```

## Before / after by spot

Broad grid: 195 shots per spot. Swish rate uses all shots as its denominator.

| Spot         |  Original makes |  Moderate makes | Original swish | Moderate swish | Original / moderate core makes |
| ------------ | --------------: | --------------: | -------------: | -------------: | -----------------------------: |
| left-corner  | 124/195 (63.6%) | 100/195 (51.3%) |          56.9% |          41.0% |                  81/81 · 81/81 |
| left-wing    | 121/195 (62.1%) |  99/195 (50.8%) |          56.9% |          41.0% |                  81/81 · 81/81 |
| top          | 121/195 (62.1%) |  98/195 (50.3%) |          56.9% |          41.0% |                  81/81 · 81/81 |
| right-wing   | 123/195 (63.1%) | 100/195 (51.3%) |          56.9% |          41.0% |                  81/81 · 81/81 |
| right-corner | 125/195 (64.1%) | 101/195 (51.8%) |          56.9% |          41.0% |                  81/81 · 81/81 |

Within the core subset, original gives 405 clean swishes. Moderate gives 360 swishes and 45 rim-makes, still 405 makes. It therefore adds some real rim interaction before it adds misses at the outer vertical edge.

Per-spot raw outcomes, shown as **original → moderate**:

| Spot         |    Swish | Rim make | Board make | Rim miss | Board miss | Short / long / left / right / other |
| ------------ | -------: | -------: | ---------: | -------: | ---------: | ----------------------------------- |
| left-corner  | 111 → 80 |  10 → 19 |      3 → 1 |  50 → 69 |    21 → 26 | 0 / 0 / 0 / 0 / 0 in both           |
| left-wing    | 111 → 80 |  10 → 17 |      0 → 2 |  39 → 67 |    35 → 29 | 0 / 0 / 0 / 0 / 0 in both           |
| top          | 111 → 80 |  10 → 18 |      0 → 0 |  37 → 59 |    37 → 38 | 0 / 0 / 0 / 0 / 0 in both           |
| right-wing   | 111 → 80 |  10 → 17 |      2 → 3 |  40 → 66 |    32 → 29 | 0 / 0 / 0 / 0 / 0 in both           |
| right-corner | 111 → 80 |  10 → 19 |      4 → 2 |  48 → 70 |    22 → 24 | 0 / 0 / 0 / 0 / 0 in both           |

Those directional zeros are genuine: this particular grid generally still reaches the rim or board, so contact-based labels take precedence. The additional 50 edge probes produce short/long/left/right outcomes and remain separate from the rates.

| 50 edge probes | Short | Long | Left | Right | Rim miss | Board miss | Board make |
| -------------- | ----: | ---: | ---: | ----: | -------: | ---------: | ---------: |
| original       |    10 |    2 |    7 |     7 |       12 |         11 |          1 |
| moderate       |    10 |    4 |    7 |     7 |        7 |         14 |          1 |

## Independent rim-size comparison

| Mapping / rim      | Makes / 975 | Make rate | Swish | Rim make | Board make | Rim miss | Board miss |
| ------------------ | ----------: | --------: | ----: | -------: | ---------: | -------: | ---------: |
| original           |         614 |     63.0% |   555 |       50 |          9 |      214 |        147 |
| moderate           |         498 |     51.1% |   400 |       90 |          8 |      331 |        146 |
| original-small-rim |         611 |     62.7% |   545 |       60 |          6 |      210 |        154 |
| moderate-small-rim |         502 |     51.5% |   390 |      104 |          8 |      320 |        153 |

Original → rim-only loses six makes and gains three (net −3). Moderate/current rim → moderate/small rim produces four more makes overall (498 → 502). That rebound dependence argues against shrinking the rim as a general difficulty fix. Both optional radii are checked against visible torus dimensions, net attachment and physical rim segment positions using shared configuration; the scoring clearance uses the same value. No optional rim is enabled in the browser or shipped.

## Delivered response and guidance

| Parameter                                |                 Original | Moderate default |
| ---------------------------------------- | -----------------------: | ---------------: |
| normalUp                                 |                      .30 |              .30 |
| softBand                                 |                      .10 |              .08 |
| softDepth                                |                   .060 m |           .075 m |
| Inner radius                             |                   .232 m |           .232 m |
| aimDeadzone / aimSensitivity             |               .018 / 3.2 |        unchanged |
| Spin / apex / outerDepth / maximum depth | −7 / 4.1 m / 3.6 / 1.2 m |        unchanged |

Within the soft band the depth slope changes from 0.6 to 0.9375 metres per unit normalized upward distance (+56.25%). At up=.20/.40, the mapped depth changes from ±.060 m to ±.147 m. Neutral up=.30 still targets centre; durations do not alter power. All five spots use the same curve and camera-relative horizontal basis. The controlled core still scores 405/405, so further tightening is deferred to human evidence rather than inventing misses.

Challenge ready/idle now has no baseline arc. Valid aiming shows 12 faint dots over only the first 0.55 seconds of the same free-flight calculation, with no landing/contact endpoint. Actual release uses the same launch velocity. Practice retains its full idle/live preview and actual flight trails remain intact. This assistance change applies to both development presets so the A/B comparison isolates the response curve. It does not measure the old full-guidance experience against the new guidance.

Development-only presets live in `src/tuning.ts`. Production always uses moderate and ignores `?tuning=original`. There is no new game mode or tuning menu. Shot-log format version 2 retains existing fields and adds the preset, actual parameters, world target and screen-right/depth offsets per shot. Spot, ball index, gesture, origin, spin, velocity, physical samples, contacts and scoring crossings remain available.

## Two human ten-shot rounds

1. With the development server running, take a few Practice familiarization shots. Use the same phone, portrait orientation and browser for both rounds.
2. Open [A — original response](http://localhost:5174/?mode=challenge&tuning=original). Play ten natural shots, without deliberately matching the automated vectors. At results, export **Session log → Copy session JSON**; clipboard denial offers a JSON download. Save it as `human-A-original.json` before restarting or changing links.
3. Open [B — moderate response](http://localhost:5174/?mode=challenge&tuning=moderate). Play ten natural shots and export `human-B-moderate.json` the same way.
4. Compare score, weak/strong miss clarity, rim/board outcomes, perceived control and desire to retry. Ignore the shared personal best for this comparison: it remains intentionally unchanged and can include previous original-tuning rounds. Both links use the same reduced challenge guidance. Production preview URLs do not activate A.
5. Record whether either version feels frustrating or still trivial. Twenty shots by one person are exploratory, not a reliable success-rate estimate. If repeated, alternate the order (B then A) to reduce learning-order bias.

Recommended human acceptance: a centred natural swipe still feels dependable, noticeably short/long swipes produce understandable outcomes, horizontal drift remains forgiving, and five angles stay consistent. The owner must decide whether this is moderately challenging. No success claim is based on the automated percentages.

## Verification results

- **68/68 unit and real-Rapier tests** pass across 25 files, plus the separately recorded 4,100-shot sensitivity study. [Unit log](verification/calibration-2026-10-20/checks/unit.log), [study integrity](verification/calibration-2026-10-20/checks/study-integrity.json).
- **37/37 browser tests** pass, including original/moderate full rounds, three portrait sizes, five camera angles, exported per-shot metadata, production override rejection, pause/restart, resource bounds and the retained Practice/audio/net regressions. [Log](verification/calibration-2026-10-20/checks/browser.log), [structured results](verification/calibration-2026-10-20/checks/browser-results.json).
- **106/106 original Phaser tests**, ESLint, TypeScript/production build and packed-art reproducibility pass. [Phaser](verification/calibration-2026-10-20/checks/phaser-unit.log), [lint](verification/calibration-2026-10-20/checks/lint.log), [build](verification/calibration-2026-10-20/checks/build.log), [art](verification/calibration-2026-10-20/checks/assets.log).
- Both full recordings decode at 400×712 with sound and original native-frame timing: original **35.12 s**, moderate **36.08 s**. The actual normalized input vectors match within 1e−6. Runtime source hashes match the footage. [Media verification](verification/calibration-2026-10-20/checks/media.json).

The first full browser run passed 36/37; the physical-outcome case still expected a rim miss for a strong-shot rebound that registered a genuine board make. The isolated real-input probe recorded rim misses at .15/.40 and a rim/board miss at .45; the corrected .40 rim fixture passed separately, then the frozen final suite above passed. [Initial log](verification/calibration-2026-10-20/checks/browser-initial.log), [probe telemetry](verification/calibration-2026-10-20/checks/strong-fixture-probe.json), [focused rerun](verification/calibration-2026-10-20/checks/browser-fixture.log). No physical outcome was forced to satisfy the old assertion. Current screenshots were archived in this milestone; historical image evidence was restored.

## Browser evidence and checks

[Review page with sensitivity maps and both recordings](verification/calibration-2026-10-20/review.html). [Original native ten-shot recording](verification/calibration-2026-10-20/recordings/original/complete-run.webm), [moderate recording](verification/calibration-2026-10-20/recordings/moderate/complete-run.webm). Both use the same ten explicit input vectors, real camera changes and actual game audio. Each includes results, retry and another physical neutral make. The selected demonstration vectors yield 10/10 versus 7/10; this is not an estimate of human performance.

Browser tests cover all five origins, idle assistance removal, partial aiming/full Practice assistance, preview/release equality, development presets, production override rejection, complete A/B rounds, physical score crossings and actual JSON export. Existing three-size portrait rounds, pause/restart, scoring, audio/net and resource checks remain in the full suite. [Checks](verification/calibration-2026-10-20/checks/).

Initial test failures were expected assumptions about the old broad guaranteed band, and exact historical near-neutral floating-point mapping. The tests now preserve historical equality under the original A/B preset while testing the new moderate physical band separately. The readable-miss browser fixture uses up=.40 for the new back-rim miss. The stored red checks prove the previously visible idle arc and insufficient edge response were observable before implementation.

No scoring, launch-solver implementation, spin, dimensions, five-spot geometry, camera orbit, round controller, best-score logic, scene/art, sound or net response changed. [32 protected source/asset hashes](verification/calibration-2026-10-20/checks/protected-files.json) verify this foundation. There are no new assets or dependencies; the existing bundle-size warning remains. Physical phone performance and human judgement remain pending. Stop here for human A/B feedback.
