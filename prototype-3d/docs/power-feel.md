# Power and physical arcs — 2026-10-20

Base HEAD: `9c16ddccc49122bc42ec999cf02c0f45c01b34e2`. Branch: `feat/3d-basketball-prototype`.

The previous target-offset model always used a 4.1 m apex. Weak and strong gestures changed the horizontal target but received identical vertical velocity. The default now scales the baseline initial velocity, so power changes height, speed, flight time and range together. There is no correction after release, random error or scoring change.

## Controls and implementation

Swipe distance is the primary power input. Duration remains intentionally irrelevant: the same normalized movement gives the same launch across device sizes and input event counts. This is an assisted arcade release with genuine physical flight, not a wrist-angle simulator.

`readShotIntent` validates and normalizes input into aim and power. `launchFromIntent` generates the launch used by aiming, release and the Practice baseline. A neutral upward distance of .30 keeps the accepted baseline solution at all five spots. The screen-relative horizontal dead zone and sensitivity remain unchanged.

For d = min(up, 1) − .30, the speed multiplier is:

`clamp(1 + .12*d + sign(d)*10*max(0, abs(d)−.08)^2, .60, 1.25)`.

All three initial velocity components receive the same multiplier. The curve has a gentle centre and a continuous slope at the soft-band boundaries. Upper/lower bounds keep extreme gestures bounded. The launch angle for a given aim stays consistent while speed varies; independent angle control is deferred. Legacy spin sign/magnitude is preserved.

Practice still has the complete preview; Challenge retains only the first .55 seconds during aiming. A shot too low to reach rim height now previews its fall to the floor instead of terminating at its apex. The observed low flight is reported as SHORT; this uses real trace samples and changes no basket validation.

Telemetry schema v3 includes the actual gesture, spot, intent/power multiplier, initial velocity, free-flight apex/speed, contacts and downward score confirmations. `mappedTarget` is explicitly null for a launch that cannot reach rim height. These are diagnostic ballistic predictions, not promises about post-collision flight.

## Actual-Rapier comparison

[Raw paired study](verification/power-2026-10-20/physics.json): 450 identical gesture probes per model, fresh worlds with the same geometry, gravity, spin, collisions and existing downward scorer. This broad grid intentionally includes many deliberately weak/strong shots; **these rates are not estimates of human success**.

| Spot | Previous moderate makes / 90 | New power makes / 90 |
| --- | ---: | ---: |
| Left corner | 30 | 31 |
| Left wing | 30 | 31 |
| Top | 38 | 33 |
| Right wing | 32 | 33 |
| Right corner | 33 | 31 |

| Outcome | Previous moderate | New power |
| --- | ---: | ---: |
| Swish | 90 | 60 |
| Rim make | 61 | 95 |
| Board make | 12 | 4 |
| Rim miss | 126 | 74 |
| Board miss | 79 | 57 |
| Short | 50 | 75 |
| Long | 32 | 85 |

Other outcome categories were zero in this grid. The study is about physical response, not selecting a desired make rate. In the ordinary subset (up .25–.35, |dx| ≤ .03), both models make all 75 probes. The new model gives larger, understandable consequences outside that region without making a normal shot a precision input.

Example observed peaks before first contact, frontal spot:

| Upward distance / viewport height | Previous apex | New observed apex | New outcome |
| --- | ---: | ---: | --- |
| .06 | about 4.09 m | 2.75 m | Short |
| .10 | about 4.09 m | 3.25 m | Short |
| .30 | about 4.09 m | 4.09 m | Swish |
| .50 | about 4.09 m | 5.09 m | Long |
| .55 | about 4.09 m | 5.64 m | Long |

Strong arcs can briefly travel above the portrait viewport; the existing camera stays fixed. Test whether that feels natural on a real phone before deciding whether to adjust framing.

## Human playtest

Open [new Practice](http://localhost:5174/?mode=practice). First try deliberately short, ordinary and longer swipes. Use distance rather than flick speed; no exact duration is required. Then play [Five Spot Challenge](http://localhost:5174/) normally.

For a development-only comparison use [previous Practice](http://localhost:5174/?mode=practice&tuning=moderate) and [previous Challenge](http://localhost:5174/?tuning=moderate). `tuning=original` also retains the older calibration; production ignores all historical tuning overrides. Remove the tuning parameter to return to the new default.

Try one ten-ball round per version. Judge whether you can intentionally produce a low/short shot and a high/long shot, predict the next adjustment, and retain comfortable normal makes. Record perceived control and desire to retry, alongside score. Use Session log → Copy session JSON to export each round before retry clears it. Automated controlled rounds cannot establish that the game feels enjoyable.

## Verification and scope

Final checks: **74 unit/physics tests, 39 browser acceptance tests, lint, build and asset checks passed**. The original Phaser app also passed its 106 tests, lint and build, with no source changes. [Check summary](verification/power-2026-10-20/checks.json) · [full browser report](verification/power-2026-10-20/browser-results.json) · [verified runtime fingerprints](verification/power-2026-10-20/source.json). Existing bundle-size and Rapier initialization deprecation warnings remain.

[Practice recording: short, standard, heavy](verification/power-2026-10-20/recordings/practice.webm) · [complete five-spot round and retry](verification/power-2026-10-20/recordings/challenge.webm). Both use native touch inputs, normal simulation time and actual rendered frames. Practice resolves SHORT / SWISH / LONG; the recorded Challenge finishes with 5/10, then retries and makes the first neutral shot. [Practice telemetry](verification/power-2026-10-20/recordings/practice-trace.json) · [Challenge telemetry](verification/power-2026-10-20/recordings/challenge-trace.json).

New regression coverage checks low/neutral/high real-Rapier arcs at all five spots, a forgiving normal band, continuous speed response, fixed release angle, low-shot preview and null-safe telemetry. Native browser touch checks preview/release equality, five-spot light/heavy outcomes, complete rounds and immediate retry. Historical calibration and spin/contact fixtures explicitly select their original model; current-model rim and board fixtures were remeasured from real collisions.

No new assets or dependencies. Ball/rim dimensions, collision geometry, restitution, spin settings, camera, scoring, round rules, audio/net response, art and the original Phaser app are unchanged. No new modes or UI mechanics.

Reproduce the paired study with `POWER_STUDY=1 npm test -- tests/power.test.ts`. Run `npm test`, `npm run lint`, `npm run build` and `npm run test:browser` in `prototype-3d/`. Run `node scripts/capture-power.mjs` with the development server running to capture native input-driven Practice shots and a complete Challenge round with retry. The recordings contain actual rendered frames; the automated capture is silent.
