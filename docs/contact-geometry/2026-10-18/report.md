# Contact geometry checkpoint — 2026-10-18

Base: `a449f5b2729d1116816f236467971b045c2f17b7`, `feat/basketball-mvp`. Previous physics-fix evidence is unchanged. New before/after recordings use real Playwright mouse-down/move/up gestures (12 moves) on a 400×712 browser viewport. No engine migration, art, input mapping, progression, economy, or visual polish changes.

## Completed

1. **One ball footprint.** `src/data/ballGeometry.ts` owns the unchanged display-size formula, basketball.png alpha-128/96-ray profile (source 1254px, maximum solid radius 593.252897px), and inverse court projection. At arrival: visible solid radius **25.17890191 screen px = 34.49164645 court units**. Previous Matter radius was 14 court units /10.22 screen px; previous scoring radius was32.4 court units. Matter radius, safe sweeps, candidate clearance and interpolated sensor crossings now derive from the same profile. The circular physical envelope conservatively bounds the slightly asymmetric photographic silhouette; it is not a per-pixel collision mask. PNG transparent padding is excluded.

   The SAME Matter body is resized with `Body.scale`; finite mass/inertia are updated before restoring static mode, without taking a world step or replacing the body. Its identifier, label and filters survive. Residual Matter keeps the exact handoff size; reset restores the foreground size. The brief release/aim squash remains presentation-only while collision-disabled.

2. **Real front/rear arc surfaces.** `src/game/hoop/rimGeometry.ts` samples the tube outline in canonical rim source coordinates. Each arc consists of eight joined convex strips in one static Matter compound body. Both use the same source-frame anchor and scale as the existing rim art. The mounting plate/net hooks are excluded. There is no solid oval collider and no longer just two endpoint circles. Runtime sweeps and debug bounds use compound PARTS, never the parent's convex hull that would fill the aperture.

3. **Explicit 2.5D eligibility.** Existing deterministic arrival depth selects front/back occupied depth for misses; accepted opening paths remain controlled through the ordered sensors. This is intentionally a staged 2.5D surrogate, not a new 3D simulation. Unconditionally enabling both projected arcs would falsely block every clean center shot because the projected oval is much shallower than the ball diameter. Arc selection never writes an impulse or awards points.

   The new footprint contacts some surfaces before the old90% cutoff: late sweeps now become eligible at80%. Foreground ascent/apex remain collision-disabled. Early handoff happens ONLY at an actual new surface intersection, on the same projected position and derivative; clear paths finish their original duration. No change to the planned screen curve,44% apex, perspective,800ms ideal duration or drag controls.

   Each board frame has a separate collision category. A frame already occupied at the depth boundary is quarantined individually until the ball is completely clear. It cannot suppress a later NEW arc/side-frame collision, and is not enabled while penetrating. Masks are refreshed before Matter steps. The existing all-disabled deferred handoff remains available for other occupied eligible surfaces. No visible rewind/teleport or second collision response.

4. **Solver-owned contact response.** Removed the height-only rim gate and `missVelocity` fixed impulses. Actual front/back classification comes from the contacted arc metadata. Matter alone solves rim/board responses; sound, miss resolution and existing feedback follow the actual collision callback. Multiple compound-part pairs in one substep are deduplicated per parent for feedback. Normal-make quality remains the existing deterministic grade/passage policy, but no longer fabricates a sensor contact or clank from that grade alone. Its+2 award remains; actual contact flags and reported impact no longer claim an unobserved rim contact.

## Evidence

All times below are fixed-step engine milliseconds since launch. Swept handoffs preserve a >=0.01 logical clearance; subsequent SAT contact is naturally later because Matter uses an inscribed polygon for a circle. Quarantined and depth-inactive bodies are excluded from enabled-body clearance, and are recorded separately in every after trace.

| Case | dx,dy | Before handoff ms | After handoff ms | After first actual contact | Score |
|---|---:|---:|---:|---|---:|
| front-rim | 0, -125 | 825.00 | 758.33 | 766.67 rim front | 0 |
| back-rim | 0, -165 | 783.33 | 783.33 | 816.67 rim back | 0 |
| backboard | 46, -145 | 808.33 | 683.33 | 691.67 backboard  | 0 |
| swish | 0, -140 | 950.00 | 950.00 | none (hoop/frame) | 3 |
| perfect | 0, -146 | 950.00 | 950.00 | none (hoop/frame) | 4 |
| airball | 80, -100 | 850.00 | 850.00 | none (hoop/frame) | 0 |
| rim-handoff | 38, -125 | 783.33 | 733.33 | 741.67 rim front | 0 |
| board-handoff | 80, -146 | 816.67 | 800.00 | none (hoop/frame) | 0 |

Before centered front rim: a scripted response at825ms with **34.196 logical units of empty space** to the nearest old collider; no actual rim contact. After: actual front arc SAT contact at766.67ms. Before rear rim: scripted response at883.33ms with40.33 units of empty space; after actual rear arc contact at816.67ms. The changed timing is the intended result of matching the actual footprint and visible arc.

The previous46/-145 board reproduction now contacts the side frame earlier at691.67ms (larger ball), rather than908.33ms. Its old numeric outgoing velocity is not an invariant: arrival/contact point changed. The handler performs no velocity assignment; recorded `solver` entries are AFTER the Matter solver, retaining normalized60Hz units. This does not reintroduce the prior collisionStart velocity-unit bug.

- [Front rim before](before/front-rim.webm) / [after](after/front-rim.webm)
- [Rear rim before](before/back-rim.webm) / [after](after/back-rim.webm)
- [Side arc38/-125 after](after/rim-handoff.webm)
- [Swish after](after/swish.webm), [perfect after](after/perfect.webm)
- All inputs have JSON fixed-step traces, post-solver samples, screenshots and videos in `before/` and `after/`. `after/overlay-parity.json` compares all10 cases with diagnostics OFF: identical plan, handoff pose/velocity and award. Original8 cases also assert exact plan equality to before.

**Edge-clearance consequence:** no tolerance/power/point values were retuned. Correcting the radius narrows arrival horizontal clearance from15.6 to13.50835 logical units. Consequently the former20/-146 normal-make example is now a genuine front-rim miss.19/-146 remains+2. Both are explicitly tested and recorded; the existing layered-hoop test uses19 for its normal-make fixture. TOP→CENTER→EXIT ordering, no-upward/no-side awards,4/3/2 scores and reset delays remain unchanged.

## Development overlay

Open `http://localhost:5173/?debugPhysics` and enter the court. Cyan=physical ball/SAT contact, green=alpha silhouette, orange=eligible physical strips/frame, grey=depth-inactive or quarantined geometry, purple=ordered sensors; arrows show velocity. Front/rear arc metadata, quarantined categories and enabled-body gaps are present in trace exports. Foreground ball outlines use the explicit foreground transform; raw fixed-court centers are separately recorded, rather than being mislabeled as a collision-space defect while the mask is OFF. Production strips diagnostic code/globals even with debug query flags.

## Verification

- `npm test`:106 tests across12 files passed. Includes footprint inversion, interpolated sensor radii, canonical source anchor/hole, depth selection, safe variable-radius sweep, and no height-only contact.
- `npm run build`, `npm run lint`, `npm run format:check`:passed. Build retains the existing Phaser chunk-size advisory.
- `npm run test:browser`:all5 suites passed (body contract, lifecycle/restart, mobile/touch/pause, campaign, failure/retry).
- `scripts/contact-geometry-check.mjs after`:10 actual browser inputs passed, real front/rear/side contacts, no scripted response, nonpenetrating ENABLED-body handoffs, constant physical density/finite inertia, exact projected footprint, correct ordered scoring and all10 overlay ON/OFF comparisons.
- `scripts/contact-geometry-production-check.mjs`:built diagnostics absent; production flags expose no globals; real input swish+3 passed.
- `scripts/layered-hoop-check.mjs`, `scripts/shot-checkpoint-check.mjs`, `scripts/perspective-check.mjs`, `npm run test:shot-feel`:passed (4/2/3 awards, net/front occlusion, no score before EXIT, in-net pause/resume, exact reset, unchanged static composition and flight).
- Logs under `verification/`; evidence hashes in `evidence-sha256.json`.

## Remaining limits / next checkpoint

- **Backboard geometry remains the previous top/side frame approximation.** It does not yet describe the visible board face/bottom or true depth. The corrected ball makes this more visible: the rear-rim trace has repeated real frame/arc contacts after the first miss, because a large ball can rattle between the old top-frame underside and rear arc. This is NOT another scripted impulse. A board contact-profile/depth audit is the next focused correction; this checkpoint does not silently move the board or add a face collider.
- **Accepted normal makes still use deterministic classification/centering.** They are not newly simulated physical rim-to-net rebounds. Honest physical contact flags and muted false clanks prevent conflating that policy with a Matter collision. Replacing this with fully physical glancing makes would change the successful-shot integration/rules and is outside these two fixes.
- Circle envelope and eight-strip arcs are calibrated approximations; the existing tiny rim-art vibration remains cosmetic (static collider anchors do not move with the tween). This is not pixel-perfect or full3D contact geometry.
- Ground response/restitution and high post-net residual speed remain as before, apart from earlier contact caused by the now-correct ball size.

Stop at this checkpoint; no extra effects or unrelated feature work included.
