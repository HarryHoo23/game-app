# Physics consistency audit — 2026-10-18

**The unnatural contacts are explained by inconsistent contact geometry/radii, scripted height-only contact decisions, penetrating handoffs, and a demonstrated Matter velocity-unit error. The canonical rim anchor itself is correctly projected at handoff. There is no evidence requiring a physics-engine migration.**

Audited repository `HarryHoo23/game-app`, branch `feat/basketball-mvp`, local and fetched remote HEAD `a8b4ee28a9bfaddc83a7ec19840408f4ff4a4c60`. Pull reported already up to date; branch divergence was0/0. Worktree started clean. Read-only source/bundled-engine inspection and real-input baseline were completed before diagnostic source edits: [pre-edit-audit.md](pre-edit-audit.md), [baseline-before-instrumentation.json](baseline-before-instrumentation.json).

This checkpoint adds **DEV diagnostics only**. No dimensions, collision masks, impulses, shooting equations, phase durations, scoring rules, progression, art, or effects were corrected or retuned. Proposed corrections below remain proposals.

## Findings, in priority order

### P1 — Three incompatible ball-size contracts

At Court01 rim arrival:

| Contract | Logical court radius | Projected screen radius |
|---|---:|---:|
| Actual Matter body |14|10.22|
| `assessShot` and `HoopSensors` clearance radius |32.4|23.652|
| Visible image canvas, nominal |36.454 equivalent|26.611|
| Solid source-alpha silhouette, approximately |34.492 equivalent|25.179|

Matter's radius is constant through all phases; visual shrink never resizes that body. `ShotPlan.hoopScale=.45` is an interpolation parameter, while the renderer independently maps it to relative visual scale`.42` with idle diameter`144×.88`. The scorer instead treats`.45` as a direct radius multiplier: `144×.45/2=32.4`. Calling that variable `projectedRadius` does not make it screen-space.

The alpha contour was sampled from the actual1254×1254 basketball texture at alpha≥128,96 rays, source outer radius≈593.253px. The visible source is smaller than the full canvas, so the nominal26.611px is not substituted for the solid silhouette. Actual transformed alpha outlines are drawn; approximate radius metrics are marked `~`.

**Evidence:** at the backboard's first actual contact, the physical ball occupies only about41% of its visible radius. The sprite can visibly penetrate a projected physical edge by roughly15 screen pixels before the small physical body contacts it. A generic change to a sprite offset cannot fix this. [geometry.json](geometry.json), [backboard trace](cases/backboard.json).

Owners: `src/game/physics/court.ts:60`, `src/domain/shooting/ShotTrajectory.ts:assessShot`, `src/game/hoop/HoopPass.ts:start`, `src/game/presentation/perspective.ts:ballDisplaySize`.

### P1 — Front/back rim reactions are not Matter rim contacts

Actual rim bodies are **two small endpoint circles**, at logical(148,285) and(252,285), radius4. They do not represent the front or rear arcs of the visual oval. Meanwhile `MissContact.advance()` checks the ball **center Y only**, after a predicted front/back classification:

- Front threshold: `y >= rim.y−6`.
- Back threshold: `y >= rim.y−28`.
- Neither test queries separation, contact normal, rim surface, or even horizontal overlap with a physical rim body.
- `missVelocity()` then assigns fixed outgoing velocities: front(−3.4,−5.2), back(+5.8,+10.5) for centered input, with side direction taken from current x.

| Real browser gesture | Response time | Ball center, logical | Nearest hoop-body surface gap* | Actual Matter rim pair at/before response |
|---|---:|---|---:|---|
| dx0,dy−125 |825.0ms|(200,284.647)|+34.196px|None|
| dx0,dy−165 |883.3ms|(200,258.686)|+40.330px|None|

`*` Signed nearest static-hoop polygon distance minus ball circle radius14. Positive means physically separated. It approximates the ball's circular envelope; real Matter uses polygonal approximations. These large positive gaps are not explained by polygon approximation.

These reactions do change the Matter body's real velocity, but **their cause is a script gate, not a Matter contact**. Depending on the art arc and visible radius, the ball can overlap the visible rim while still far from the only physical endpoints. The distinction is now explicit in the overlay and event provenance.

A rim MAKE is similarly predicted at arrival: its sensor `contacts.rim` is set before any engine contact, and CENTER triggers rim feedback. The reproduced dx20,dy−146 case scores2 without a Matter rim pair during entry. `HoopPass` additionally applies a continuous lateral centering trajectory for contact candidates. This is current controlled-motion policy, not a measured collision normal or engine impulse; it was preserved.

Owners: `src/game/physics/court.ts:36`, `src/domain/shooting/ImpactResponse.ts:42`, `src/game/hoop/HoopPass.ts:start/pose`.

### P1 — Backboard callback halves velocity by mixing timestep units

The bundled Phaser3.90 Matter engine performs:

1. Body integration at the8.333ms fixed substep.
2. `collisionStart` callbacks.
3. Position and velocity collision solver.
4. `Body.updateVelocities`, normalizing velocity to60Hz units.
5. `collisionActive`, then `collisionEnd`.

During `collisionStart`, `body.velocity` is still substep displacement. `setVelocity()` expects normalized pixels per60Hz tick. The current backboard path passes `body.velocity` through `missVelocity()` and immediately calls `setVelocity()` inside this callback. At120Hz, that halves the setter input.

Reproduction dx46,dy−145, first right-board collision at908.3ms:

| Measurement | vx | vy |
|---|---:|---:|
| Incoming normalized60Hz velocity |1.79204|6.92416|
| Raw `body.velocity` in callback |0.89602|3.46208|
| Current post-solver outgoing velocity |0.14727|3.48207|
| Isolated probe: skip redundant board setter, then let Matter solve |0.38783|6.90417|

The probe changed **one runtime method call in a separate disposable browser context**, used the same pointer input, left source files untouched, and kept score0. It confirms the unit error's effect rather than merely inferring it from code. Tangential friction/solver effects account for the small difference between6.924 incoming and6.904 outgoing in the probe; this is not intended to be a no-friction bounce.

[velocity-probe.json](velocity-probe.json), reproducible with `node scripts/physics-audit-velocity-probe.mjs`.

Owners: `src/game/scenes/GameScene.ts:respondToMiss`, `src/domain/shooting/ImpactResponse.ts:missVelocity`; installed primary sources `node_modules/phaser/src/physics/matter-js/lib/core/Engine.js`, `lib/body/Body.js`, `components/Velocity.js`. Phaser's existing `ball.getVelocity()` returns normalized velocity if one is needed inside a callback. A board callback that intends no custom impulse should simply leave response velocity to the solver.

### P1 — Matter can be enabled after a collider has already been penetrated

`finishControlled()` immediately enables all collisions, makes the ball dynamic, places it at the deterministic arrival, and copies its normalized velocity. There is no sweep to the first contact or overlap clearance check.

- dx38,dy−125 enables Matter at825ms with approximately**9.385 logical px** of overlap with the right rim's circular envelope. A height-gated front impulse runs in that same substep. A real Matter rim pair follows at833.3ms, then a backboard pair at883.3ms. This stacks a scripted response with a real solver contact and separation correction.
- dx80,dy−146 enables Matter at800ms already**1.5 logical px** into the right-board contact envelope, resolves as airball immediately, and emits a real board collision at808.3ms.

The second case also exposes a clearance-bound error: `contactZoneHalfWidth=228/2+14=128` omits the side frame's half thickness3.5. Physical reach is`114+3.5+14=131.5`. A center atx330 is declared horizontally clear because130>128 while still potentially touching the frame. This is a real geometry-bound disagreement, not a score-rule defect.

Owners: `src/game/physics/court.ts:78`, `src/domain/shooting/ImpactResponse.ts:55`, `src/data/impactFeel.ts:contactZoneHalfWidth`. [Penetrating handoff](cases/penetrating-handoff.json), [airball then board](cases/airball-then-board.json).

### P2 — Backboard colliders and art describe different frames

The art's cropped frame is250 logical assembly units wide, while physical board width is228. At master projection0.73:

- Visible backboard: x108.75..291.25, y167.306..274.04.
- Physical top rectangle: logical y190.5..197.5 → screen y187.535..192.645. Its upper edge is **20.229 screen px below** the art's top edge.
- Physical side outer edges: screen x114.225 and285.775, **5.475px inside** the art's outer sides.
- Physical sides end at logical y300 → screen y267.47, **6.57px above** the art's bottom.
- There is no Matter glass-face collider or lower-frame collider. The face may intentionally allow the approaching ball in front of it in this2.5D model; absence alone is not a bug. The frame offsets and scale disagreements are measurable independently of that design decision.

`getHoopGeometry()` calls itself screen-space in its comment, but these are logical coordinates later projected. This naming can conceal the mismatch. [geometry.json](geometry.json).

## Phase and collision-authority trace

Coordinates: logical court400×712; Court01 rim(200,285); screen rim(200,256.52). Static court projection is`screenRim + .73×(point−logicalRim)`. The visual assembly uses exactly this center and master scale. Both rim copies share one source and one transform. At `t=1`, `projectShot` equals `projectCourtPoint`; **there is no unexplained center translation at handoff**.

| Phase | Motion authority | Matter body/filter | Collision/scoring authority |
|---|---|---|---|
| Idle/aim |BallAnimator foreground pose; body held at(200,620)|static, all-bits mask|No moving physical ball; preview is not a physical flight|
| Release → deterministic arrival |ShotController/sampleShot, fixed8.333ms updates|static +mask0 for entire interval|No actual ball-vs-board/rim/ground collision can occur|
| Made candidate → TOP/CENTER/EXIT |HoopPass deterministic descent|still static +mask0|Swept logical HoopSensors; candidate contacts were set by assessShot|
| Miss arrival → physical observation |MatterCourt.finishControlled|dynamic +all-bits mask immediately|Matter pairs OR height-gated MissContact, whichever resolves first|
| EXIT/handoff on made basket |Matter after controlled pass|dynamic +all-bits mask|EXIT alone commits the candidate score; later ground/hoop contacts cannot award another basket|
| Settling |Matter plus existing response/feedback hooks|dynamic +all-bits mask|Miss secondary actual contacts can trigger feedback; no new score|
| Ready/reset |Static reset to origin|static +all-bits mask|Current shot/pass cleared; foreground ball reappears|
| Application pause/blur/hidden |No GameScene fixed-step loop; tweens/time paused|mask retained, engine not stepped|No progressing contacts or sensors; resume continues existing phase|

The foreground projection intentionally adds up to172.914 screen px of extra Y at idle/launch, decaying to0 at arrival. Thus projecting the physical logical body by the fixed court transform does **not** align its center with the foreground sprite throughout primary flight. At launch the physical projection is y501.07 while the visible center is673.984. This is visible in the diagnostic overlay and is intentional perspective, not something to fix by globally enabling collisions or adding another arbitrary offset.

The white overlay marker is a **counterfactual approximate sweep** of the deterministic logical path against current static polygons at241samples, treating the circular ball envelope as radius14 and ignoring mask/depth. All reproduced primary paths potentially intersect the logical top board around t≈.171–.175, when the visible foreground ball is elsewhere and mask0 is intentional. This is not continuous collision detection and not a prediction that an actual event will occur. It demonstrates why blindly enabling Matter for the entire primary trajectory would be wrong.

Matter world autoUpdate is false. Each loop steps the engine first, then advances/places controlled motion, then handles pass/miss/result. A handoff therefore normally waits until the next8.333ms engine step for its first actual pair. Fixed-step quantization explains small time rounding; it does not explain the large spatial/velocity mismatches above.

## Scoring and sensors

There are no Matter sensor bodies in this hoop. `HoopSensors` is a pure swept, downward-only logical sequence:

| Sensor | Logical Y | Screen Y |
|---|---:|---:|
| TOP |263|240.46|
| CENTER |285|256.52|
| EXIT |413|349.96|

The accepted horizontal center corridor is`48−32.4=15.6` logical px from the rim center, distinct from both Matter body size and actual visible silhouette. `assessShot` first evaluates an arrival-error ellipse and sets candidate impact/quality. Only made candidates start HoopPass; the descending`.9→1` approach segment is carried into TOP detection if needed. Upward, sideways/out-of-corridor, missing or out-of-order crossings invalidate the pass. CENTER triggers net/audio/entry presentation; EXIT resolves score. Later Matter pairs do not change this score.

Reproduced swish(0,−140): primary becomes controlled pass at808.33ms, IN_NET/CENTER at841.67ms, EXIT/Matter/score3 at950ms. CENTER→EXIT≈108.33ms. Reproduced rim MAKE(20,−146): primary800ms, TOP816.67ms, CENTER841.67ms, EXIT950ms, score2. There are **no actual engine rim pairs during those controlled intervals**. Sensor order remains valid; it is the contact provenance and geometry that need correction, not replacing ordered EXIT with collision-based scoring.

At swish handoff, vy≈20.731 normalized px/tick; the first ground contact occurs around1141.67ms, with incoming normalized vy≈23.926. The legacy `physics.maxSpeed=17` setting is not applied by this handoff path. Existing restitution and this high handoff speed explain the later high residual bounce. No landing polish or restitution change was made here.

## Reproduction evidence

All cases use actual browser pointer start(200,674),12move samples, release at start+(dx,dy), Court01/base equipment. No injected plans, score writes, or fabricated poses. Videos are diagnostic: the harness pauses the Phaser scene at a naturally reached render frame for a screenshot and then resumes. Captures show the **first available displayed frame after** the relevant event, not necessarily its exact substep. JSON event timestamps preserve exact fixed-step measurements; browser wall-clock/video timing includes diagnostic pauses.

| Case | dx,dy | Matter handoff | Contact/result evidence | Score |
|---|---|---:|---|---:|
| [Front rim](cases/front-rim.webm) |0,−125|825.0ms|Height response at825; no rim pair|0|
| [Back rim](cases/back-rim.webm) |0,−165|783.3ms|Height response883.3; no rim pair|0|
| [Backboard](cases/backboard.webm) |46,−145|808.3ms|Predicted airball; real side-frame pair908.3|0|
| [Swish](cases/swish.webm) |0,−140|950.0ms|Ordered EXIT; later ground contact|3|
| [Clean airball](cases/airball.webm) |80,−100|850.0ms|No hoop contact; later ground contact|0|
| [Airball then board](cases/airball-then-board.webm) |80,−146|800.0ms|Already overlaps board envelope; resolve precedes pair808.3|0|
| [Rim make](cases/rim-make.webm) |20,−146|950.0ms|Candidate-rim feedback in mask0 pass; no rim pair|2|
| [Penetrating handoff](cases/penetrating-handoff.webm) |38,−125|825.0ms|Overlap9.385; scripted impulse then actual rim833.3/board883.3|0|

Each video has a same-named `.png` and `.json` in `cases/`. [summary.json](summary.json) collects the cases, launch predictions, supports, response sources and parity checks. The original pre-instrumentation baseline independently reproduces the main findings.

## DEV overlay usage and interpretation

Open `http://localhost:5173/?debugPhysics` and hit the court. Add `&debug` only if browser-test scene access is desired. After entry:

- Orange: actual Matter collider vertices through the fixed court projection, including physical board/rim/ground.
- Cyan outline: projected physical ball. Cyan crosses: actual Matter SAT support points from collisionStart, not the expected arrival or a script gate.
- Green: transformed source-alpha silhouette of the actual visible ball, including rotation, deformation and parent transforms.
- Purple: logical swept scoring sensors, not Matter sensor bodies.
- Yellow cross: predicted arrival center, **not** a physical contact point. Amber cross: closest physical surface to that target, a geometric comparison rather than a swept collision guarantee.
- White cross: approximate counterfactual first potential logical-path contact, ignoring mask/depth as described above.
- Pink line/cross: center-height response gate and response-center location, **not** an actual contact support. Pink arrow: **requested scripted velocity** before setVelocity/solver.
- Yellow arrow: current normalized physical/controlled velocity. Arrow length is a5-tick extrapolation through projection, not a free-flight simulation.

`window.__physicsAudit.events` retains up to2,000events including launch, prediction, handoff, phase/filter transitions, every fixed substep, `matter:start/active/end`, height/collision response provenance, requested impulses, resolution and reset. Start is recorded before the game handler and before the solver; active is post-solver. End explicitly has no current supports. `frames` retains2,000render samples including exact sampled silhouette bounds. `snapshot()` returns current measurements; `clear()` clears stored records. Data include logical position, fixed projection, radii, raw and normalized velocities, actual supports/normal/depth, mask/static state, and stage/score.

Observers never set body position/velocity/masks or scoring state. Shutdown unregisters world/scene listeners, destroys overlay objects and removes the global; initialization clears stale observer references. A query-flag removal + scene restart is browser-checked. Production builds exclude both drawing/collection code and event hooks; query flags cannot re-enable them.

## Minimal corrections proposed — not implemented

1. **Fix backboard callback units first.** In `respondToMiss`, do not call `setVelocity()` for a backboard contact when no custom board impulse is intended. Let Matter's normal/friction/restitution solver handle it. If a normalized velocity must be read in a callback, use the bundled `ball.getVelocity()`/Body.getVelocity API. Add a120Hz integration regression proving no half-speed loss; retain the same score and contact timing.
2. **Use actual collider bounds for clearance and handoff checks.** Derive the observation region from side-frame bounds expanded by the active ball envelope, rather than omitting half thickness. Check overlap at controlled handoff and sweep the last controlled segment to the first eligible court contact, rather than enabling Matter deeply embedded. Do not teleport outside, add a random kick, or let both scripted and solver responses claim the same contact. Regression cases are(80,−146) and(38,−125).
3. **Define one explicit contact-space contract near the hoop.** Keep canonical rim center/master projection. Centralize physical contact ball radius and board/rim profiles in logical units and validate their projected silhouette against art. The existing32.4scoring clearance is a gameplay rule; do not silently replace it or globally enlarge radius14 to36 without deciding which visual/contact-size contract is authoritative. Board top/side frame alignment can be corrected from one profile rather than sprite offsets scattered through the scene.
4. **Replace height-only contact authority locally, preserving2.5D and ordered scoring.** At the eligible near-rim interval, represent the required front/rear contact profile with phase-filtered static/compound Matter shapes derived from canonical geometry, or sweep/query those same Matter shapes to identify first contact before dynamic handoff. Use contact separation/normal and the existing solver instead of a Y-only impulse. Keep primary foreground flight intentionally collision-disabled; keep TOP→CENTER→EXIT scoring and existing outcome rules until explicitly reviewed. Merely relabeling two endpoint bodies as front/back does not create the missing arcs.
5. **Keep regression evidence tied to the active path.** Some existing Matter/BasketDetector tests exercise legacy pure-Matter trajectories and a detector unused by GameScene; they do not prove the current hybrid game's contact consistency. Preserve them, but add integration cases for this actual controller→handoff→Matter route, with silhouette/contact-position and velocity assertions.

Items1and2are small, directly evidenced corrections. Items3and4need a shared contact profile and narrowly bounded integration work, not a new physics engine or a full gameplay rewrite. No additional effects are needed to establish the cause.

## Verification and changed files

- `npm test`:92/92pass; includes four new measurement tests for actual vertex projection, signed surface distance, source-alpha silhouette extraction, and pre-normalization velocity units.
- `npm run lint`, `npm run build`, `npm run format:check`, `git diff --check`:pass. Existing Phaser chunk-size advisory remains.
- `node scripts/physics-audit-check.mjs`:8real-input scenarios, filter/static intervals, contact provenance, actual SAT supports, pre-solver units, penetration, ordered score, and no page errors. Overlay-on/off trials compare exact launch plans, handoff poses/velocities, first requested response values and outcome classifications; no claim of whole-device performance parity.
- `node scripts/physics-audit-velocity-probe.mjs`: paired disposable runtime experiment, as quantified above.
- `node scripts/physics-audit-production-check.mjs`: built-JS diagnostic exclusion, absent globals despite query flags, actual production swish score3.
- Existing `physics-check.mjs`, `lifecycle-check.mjs`, `shot-checkpoint-check.mjs`:physical body contract, restart/exit, ordered scoring, nonreentrant launch, in-net pause/reset and physical board contact.
- Independent read-only review checked noninterference, source-unit claims and projection. It led to stronger exact handoff parity assertions, explicit requested/actual velocity labels and a stale-observer lifecycle fix.

Runtime changes: `src/game/debug/PhysicsAudit.ts` and `src/game/debug/auditGeometry.ts` (new); `src/game/scenes/GameScene.ts` (DEV-gated observational hooks and observer reset only).

Tests/tooling: `src/tests/physicsAudit.test.ts`; `scripts/physics-audit-check.mjs`, `scripts/physics-audit-velocity-probe.mjs`, `scripts/physics-audit-production-check.mjs` (all new).

Evidence: this directory, with source hashes in `source-manifest.json`. No core physics/controller/hoop-renderer/scorer source was changed.

## Limits

Contact gaps use a circle envelope against actual Matter polygons; differences below subpixel polygon approximation should not be overinterpreted. Source silhouettes use96rays and alpha128, not every translucent edge pixel. White sweep sampling is approximate, not CCD. Desktop Chrome at400×712was used; phone hardware, Safari and refresh-rate performance were not measured. The isolated velocity probe is explicitly counterfactual, not a shipped fix. The audit identifies and instruments faults; it does not claim they are corrected.
