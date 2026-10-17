# Read-only audit before source edits

Inspected and pulled `feat/basketball-mvp`: latest local+remote HEAD `a8b4ee28a9bfaddc83a7ec19840408f4ff4a4c60`, already up to date. Worktree clean. Date uses client Australia/Melbourne2026-10-18.

Read GameScene, MatterCourt, ShotController/Trajectory, HoopPass/Sensors, ImpactResponse, ball renderer/projection, canonical hoop/source-layout, tuning and previous checkpoint reports. Inspected bundled Phaser3.90 Matter Engine/Body/World code. Actual browser baseline performed using pointerdown/move/up only; observational runtime wrappers forwarded original calls without changing plans/results. See baseline-before-instrumentation.json.

- Static ball radius14 logical throughout; visible ball nominal diameter126.72 near player,53.22 at rim. Court projection scales0.73. Scoring radius32.4 logical at arrival, neither actual Matter14 nor inverse-projected visible nominal36.45.
- Matter has two radius4 rim endpoints at(x±52,y), not front/rear oval arcs. Board has top228×7 at y−91 and two7×108 sides; no glass face/bottom body. Actual rendered board250wide with independently placed/cropped frame.
- Full primary flight is static/mask0. Made candidate continues static/mask0 through TOP/CENTER/EXIT; only EXIT enables dynamic Matter. Miss enables Matter on deterministic arrival. No Matter collision can establish primary contact during those disabled intervals.
- Front-rim baseline(0,−125): handoff+height response≈825ms, ball(200,284.647), incoming(0,7.166), fixed outgoing(−3.4,−5.2); no Matter rim pair.
- Back-rim(0,−165): handoff≈783.3ms; height response≈883.3ms at(200,258.686), outgoing(5.8,10.5); no Matter rim pair.
- Backboard(46,−145): actual right-frame pair≈908.3ms at ball(296.884,293.373), support(310.875,293.868). Game handler runs before baseline observer, so baseline velocities are after handler; new instrumentation must register before handler and also capture post-solver state.
- Swish(0,−140): EXIT/handoff≈950ms at y421.81 with vy20.73; score3; no rim pair.
- Airball(80,−146): resolve at800ms, then actual right-board contact808.3ms. Predicted miss type does not guarantee no later physical contact.
- Bundled Matter collisionStart fires before position/velocity solver and before velocity normalization. Body.velocity during collisionStart is the current substep displacement; setVelocity expects normalized60Hz units. The backboard branch passes body.velocity unchanged into setVelocity inside that event, a potential half-step unit mismatch requiring paired before/after solver evidence.

Authorized implementation is bounded diagnostics only: DEV/query-gated observer and overlay; pure geometry helpers/tests; minimal scene event hooks. It will not change masks, dimensions, impulses, shot plans, score rules, sensor thresholds or phase timing. Measurements will distinguish approximate nearest-surface predictions from actual SAT supports, and scripted response origins from engine collisions. Corrections will be proposed after evidence, not applied in this checkpoint.
