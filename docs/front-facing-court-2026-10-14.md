# Front-facing court and shooting

Request: use the supplied `src/assets/hoop/hoop-board.png`, centre the hoop like the reference, and adjust shooting trajectories.

## Implemented

- Preload the supplied transparent PNG directly. No modifications to the source image.
- Position the image by its rim anchor, keeping its opening centred at x=200 in the 400-unit logical court.
- Split the rendered image at the rim into background/front layers; descending balls pass visually behind the near rim and net.
- Replace the side-on backboard collision strip with front-facing top/side frame bodies and two rim edge bodies. Image anchor and collision dimensions are centralized in `src/data/hoop.ts` and `getHoopGeometry`.
- Move the physical launch position to (200,620). All ten hoops share the centreline; their heights, target scores, shot budgets and rewards are retained.
- Apply 0.45 horizontal drag sensitivity before the existing power calculation. Vertical drags stay centred; left/right input remains directional without snapping or automatic scoring.
- Widen the initial touch region for the enlarged foreground ball. Physical ball radius remains 14.
- Keep trajectory prediction derived from the same launch velocity and fixed Matter step. Dots begin outside the visible ball; the idle arrow hides during aiming/flight.
- Update browser test gestures to the new origin rather than injecting successful shots.

## Verification

33 tests pass, including new centreline, mirrored drag, insufficient-power and left/right miss cases, and actual Matter shots on all ten courts. Existing swept downward-only scoring, last-shot, rewards, storage and purchase tests remain intact.

Browser checks pass for the physics-body contract, scene exit/restart, real mouse/touch baskets, cancellation, full ten-shot successful run, failed run/retry, unlock/reload and equipment purchases. The calibrated first-court vertical gesture (146 logical units upward) produces a perfect basket; ten such shots score 40, earn three stars/96 coins and unlock court 2.

The game remains a 2D arcade simulation with front-facing rendering and perspective ball scaling. It does not add a separate 3D depth physics engine. Scoring values, progression, coins, equipment effects and stored save data are preserved.
