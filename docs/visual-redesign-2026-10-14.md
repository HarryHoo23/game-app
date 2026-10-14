# After Hours — visual milestone 1

## Scope

Adapt the attached visual direction's nocturnal street-court atmosphere, restrained mint/amber palette, cream editorial typography and tactile basketball presentation. The reference is not copied or embedded as game UI.

This pass covers the central theme, home screen, gameplay HUD, night environment, basketball rendering, aiming guide and momentary score feedback. Level-select, equipment and result layouts are deferred as requested.

## Reused

Existing domain rules, level definitions, scoring, equipment calculations, save schema, audio/haptics services, pointer mapping, fixed simulation stepping and Matter bodies are retained. Barlow and Barlow Condensed remain the typography foundation. A local Permanent Marker font is used only for painted environment lettering and short scoring effects.

The pre-existing `src/assets/background/basketball-court.png` supplies the night environment. A 292 kB WebP copy replaces the 2.44 MB PNG in the shipped bundle; the source PNG is preserved unchanged. The reference image remains a design reference, not a runtime asset.

## Presentation modules

- `game/themes/theme.ts`: colors, type, spacing, radii, shadows and motion tokens installed as CSS custom properties.
- `game/assets/manifest.ts`: stable texture keys and local court asset URL.
- `game/assets/ballTexture.ts`: deterministic Canvas pebble grain, curved seams and directional sphere shading. Generated locally on preload, without remote services.
- `game/environments/NightCourt.ts`: swappable court theme registry, background, subdued environment lettering and light atmosphere; home hero ball composition.
- `game/environments/HoopPresentation.ts`: presentation aligned with the existing rim/backboard geometry.
- `game/environments/BallPresentation.ts`: independent visual scale and shadow, never resizes a physics body.
- `game/ui/components.ts`, `icons.ts`, `HomeScreen.ts`, `GameHud.ts`: buttons, coin display, stat panels, progress, home template and reactive HUD.
- `game/ui/premium.css`: new layout/surface styling scoped to home and live gameplay, with shared desktop framing.
- `game/effects/AimGuide.ts`: the same free-flight predictor, with mint dots, endpoint glow and a restrained direction cue.
- `game/effects/ScoreFeedback.ts`: ephemeral painted callout and brief reveal/fade.

The home/preload sections of `menus.ts`, `GameScene`, `ShotInput`, `Feedback`, `MatterCourt` and `main.ts` only wire these presentation modules into existing behavior.

## Deliberate layout adaptation

The reference's front-facing, centered basket implies a different shooting/collision model. This pass keeps the game's existing side-on hoop and launch coordinates, while improving its glass, metal and net treatment. Rendering a centered basket over unrelated collision bodies would mislead the player.

The basketball appears larger in the foreground and reaches its original apparent size near the hoop. This is a separate rendered image; its position follows the original body, and the collision radius remains 14 logical units. Input still uses the original touch region and drag mapping.

Only the night court theme is implemented. Other themes can be registered later; no new courts or difficulty rules are added.

## Verification

- 26 existing domain and actual bundled-Matter tests pass.
- Strict TypeScript / Vite build, ESLint and formatting checks pass.
- `scripts/visual-check.mjs` captures home, gameplay, aiming, scoring and small-phone views; verifies a real mouse shot still scores 3 and the sound control retains its icon when toggled.
- Existing physics-body, lifecycle, mobile-touch, full successful campaign and failed-run checks are rerun for regression coverage.
- Small-phone checks include 320 × 568; larger phone preview is 430 × 820. Physical iPhone/Android testing is still a separate player-validation step.
- Domain, data, storage, equipment and scoring files have no changes in this redesign.

Local preview: http://localhost:5173/. With Vite running, `node scripts/visual-check.mjs` regenerates the screenshot evidence in ignored `test-results/`.
