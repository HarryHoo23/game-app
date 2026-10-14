# Shot feel checkpoint 1

User requested that development stop and verify the first five steps before adding hoop/camera/ambient polish.

## Implemented

1. Controlled 2.5D trajectory: normalized t, horizontal interpolation, configurable parabolic vertical motion. Ideal duration 880ms; power-dependent timing remains inside 750–1050ms.
2. Perspective: smoothstep scaling from 1 to 0.45, independent of image y-position.
3. Backspin: about two negative rotations, lightly influenced by power. Angular velocity is continuous at the Matter handoff.
4. Preview: nine mint dots sampled from the exact same flight plan, with larger/brighter near dots and subtle glow. No straight-arrow guide.
5. Anticipation/release: subtle vertical compression while aiming; 100ms stretch pulse on release; fully restored afterward. Reduced-motion mode disables shape effects.

## Boundaries

- `src/data/shotFeel.ts`: tuning values.
- `domain/shooting/ShotTrajectory.ts`: input mapping, flight sample, preview samples, arrival assessment.
- `domain/shooting/ShotController.ts`: progress, single arrival emission, reset.
- `domain/shooting/BallAnimation.ts`: pure deformation timing.
- `game/effects/TrajectoryPreview.ts`: canvas preview only.
- `game/environments/BallAnimator.ts`: sphere rendering, shadow, perspective and deformation.
- `MatterCourt`: disables main-flight collisions, mirrors the controlled pose, restores Matter at hoop depth for residual bounces.
- `GameScene`: coordinates lifecycle and existing session/HUD/feedback. No inline parabola or reward rules.

The 2.5D arrival test includes projected ball clearance, lateral accuracy, power/depth accuracy and a downward approach. It assesses once at t=1, never at an earlier screen-space crossing. The original point values and progression/economy/save rules are retained. Upgrades still do not guarantee a make.

## Evidence

- 52 unit/integration tests pass, including 19 new trajectory/controller/deformation tests, all ten existing courts, weak/strong/lateral misses under starter and maximum gear, exact timing/scale/spin, shared preview, single arrival, and pause-independent progression.
- Build, lint and formatting pass.
- `scripts/shot-feel-check.mjs`: real mouse gesture, aim compression, launch stretch, intermediate shrink/spin, exact 880ms arrival, primary-body static during flight / dynamic after arrival, weak/strong/lateral misses, paused progress and resumed make. Recording: `docs/visuals/shot-feel.webm`.
- Existing browser tests: full campaign, final shot, reload/unlock, lifecycle, actual touch cancellation/make, upgrades and full failed run/retry pass.
- A separate source reviewer found no actionable checkpoint-one defects. The noted spin-speed continuity detail was corrected by deriving handoff angular velocity from the plan.

## Next checkpoint, after player feel review

Refine rim/backboard reactions and distinct sound hooks; separate/stretch/swing the net; add restrained ghost trail, camera emphasis, particles and ambient life. These are not claimed complete in this first checkpoint. The success criterion remains subjective player enjoyment; automated checks establish correctness, not that the shot is fun.
