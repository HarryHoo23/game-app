# Perspective composition

Render-only change. Physics/trajectory, canonical rim coordinates, scoring, level configurations and progression are unchanged.

All perspective values live in `src/game/presentation/perspective.ts`:
- Hoop container master scale: 0.73. Backboard screen width: 182.5/400 = 45.625%.
- Whole hoop position: canonical rim plus -4% of logical court height (-28.48px).
- Existing per-asset alignment remains local to one Phaser Container; no individual layer repositioning for composition.
- Cool/dim tint on board and rims; net brightness reduced.
- Idle ball diameter: 126.72px, 12% smaller. Centre y674.0 and bottom y737.34 produce 20% crop at the 712px viewport edge.
- Visual near-rim diameter: 42% of idle diameter. Shot timing, power, collision radii and sensor planes are untouched.

The display projection maps existing logical positions to the new screen composition. Aim dots, ball and debug sensors share the hoop transform; feedback is anchored to the projected rim. The ball occupies the same display list as the grouped hoop for interleaved front-rim/net occlusion; its display size compensates for parent scale. Input hit testing follows the visible foreground ball while drag/power calculation stays unchanged.

Verification: production build, lint/format, 64 unchanged domain tests; `scripts/perspective-check.mjs` verifies actual container ownership, screen bounds, crop ratio, desktop/mobile screenshots, rim scale, successful shot and reset; existing layered hoop and shot-feel browser checks pass. Independent review found and corrected the feedback anchor; no remaining important findings.

Static screenshots: `docs/visuals/perspective-idle.png`, `docs/visuals/perspective-small.png`.
