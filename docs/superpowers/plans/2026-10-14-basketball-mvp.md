# Basketball MVP Implementation Plan

> For agentic workers: use superpowers:executing-plans. Track steps with checkboxes.

Goal: A locally playable portrait basketball campaign with skill-based shots and saved upgrades.
Architecture: Pure TypeScript rules, a Matter simulation adapter, thin Phaser scenes, DOM UI, replaceable services.
Tech Stack: TypeScript, Vite, Phaser 3.90, Matter, Vitest, ESLint, Prettier.
Spec: ../specs/2026-10-14-basketball-mvp-design.md

## Global Constraints
No React, backend, accounts, cloud, payments, ads or Capacitor. Ten levels, four equipment categories, levels 1–5. Costs 100/250/500/1000. Base scoring 2/3/4. Stars at 1/1.2/1.4 times target. All shots resolve before results. Portrait 9:16, touch-first.

## Review Focus
- Final airborne shot cannot cause premature failure: session test.
- Fast crossings, upward motion, rim contact and ground bounce: detector tests.
- Duplicate result rewards and unaffordable upgrades: progress tests.
- Malformed/future/unwritable saves: storage tests.
- Paused/resized/cancelled touches and scene cleanup: browser checks.

## Task 1: Domain and persistence
Files: src/domain/*, src/data/*, src/services/storage.ts, src/tests/domain.test.ts.
Interfaces: launchVector(dx,dy,stats) -> vector|null; BasketDetector.sample(previous,current) -> boolean; LevelSession.launch/resolve -> session state; calculateStats(progress) -> Stats; completeLevel(progress,result) -> PlayerProgress; purchaseUpgrade(progress,category) -> PlayerProgress; ProgressStore.load/save.
- [x] Write tests for the review focus and exact scoring/star/cost boundaries.
- [x] Run npm test and observe missing behavior failures.
- [x] Implement pure functions, configuration and validated storage.
- [x] Run npm test; expect all domain and storage tests pass. Commit.

## Task 2: Shooting and one complete level
Files: src/game/physics/*, src/game/input/*, src/game/systems/*, src/game/scenes/GameScene.ts.
Consumes Task 1 launchVector, BasketDetector, LevelSession, Stats.
Produces playable GameScene with a resolved level result, real Matter ball, directional aiming, collision feedback and pause.
- [x] Add physics/launch tests and run before implementation.
- [x] Implement fixed-step court, sampled detector, pointer cancellation, trajectory preview and feedback.
- [x] Build and run tests; browser-check one complete level and last-shot behavior. Commit.

## Task 3: Campaign, equipment and presentation
Files: src/app/*, src/game/scenes/*, src/game/ui/*, src/main.ts.
Consumes Task 1 progress, storage, equipment and result interfaces; Task 2 GameScene.
Produces menu, ten-level selection, result scene, upgrade screen and persisted progression.
- [x] Add integration tests for result/purchase/save behavior before implementation.
- [x] Implement responsive original court styling and all navigation.
- [x] Test menu → level → result → upgrade → reload, including locked levels. Commit.

## Task 4: Verification and documentation
Files: README.md, browser test script, verification notes.
- [x] Run tests, build, lint and formatting check.
- [x] Capture desktop/mobile screenshots and exercise drag, pause, retry and resizing.
- [x] Review branch, fix important defects, document limitations and exact commands. Commit.

## Execution decisions
User explicitly requested development after approving the design; proceed inline without another approval cycle. Use a feature branch in the existing empty project so the user's VS Code directory remains the runnable project. No separate worktree is necessary to protect existing application code.

## Completion record

All four deliverables are implemented and verified. See `../verification-2026-10-14.md` for exact checks, fixes and deviations. Browser integration checks were added during playtesting; no claim is made that every UI method had a prior failing unit test. Work remains on `feat/basketball-mvp` in the original project directory. Real-phone feel and balance tuning remain player-validation work.
