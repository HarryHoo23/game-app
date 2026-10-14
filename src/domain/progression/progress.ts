import { levels } from "../../data/levels";
import { categories, upgradeCosts, type Category } from "../../data/equipment";
import { stars } from "../levels/session";
export interface PlayerProgress {
  schemaVersion: 1;
  highestUnlockedLevel: number;
  coins: number;
  stars: Record<number, number>;
  equipment: Record<Category, number>;
  ownedEquipment: Category[];
  equipped: Record<Category, Category>;
  claimedRuns: string[];
}
export interface LevelResult {
  runId: string;
  levelId: number;
  score: number;
}
export interface Stats {
  smoothing: number;
  perfectTolerance: number;
  powerControl: number;
  coinMultiplier: number;
  maxSpeed: number;
}
export function initialProgress(): PlayerProgress {
  return {
    schemaVersion: 1,
    highestUnlockedLevel: 1,
    coins: 0,
    stars: {},
    equipment: { shoes: 1, sleeve: 1, ball: 1, hoop: 1 },
    ownedEquipment: [...categories],
    equipped: { shoes: "shoes", sleeve: "sleeve", ball: "ball", hoop: "hoop" },
    claimedRuns: [],
  };
}
export function calculateStats(p: PlayerProgress): Stats {
  return {
    smoothing: (p.equipment.shoes - 1) * 0.05,
    perfectTolerance: 6 + (p.equipment.sleeve - 1) * 2,
    powerControl: (p.equipment.ball - 1) * 0.04,
    coinMultiplier: 1 + (p.equipment.hoop - 1) * 0.05,
    maxSpeed: 17,
  };
}
export function rewardFor(p: PlayerProgress, result: LevelResult) {
  const level = levels.find((l) => l.id === result.levelId);
  if (!level) return 0;
  const s = stars(result.score, level.targetScore);
  return s
    ? Math.floor(
        level.rewardCoins *
          [0, 1, 1.3, 1.6][s] *
          calculateStats(p).coinMultiplier,
      )
    : 0;
}
export function completeLevel(
  p: PlayerProgress,
  r: LevelResult,
): PlayerProgress {
  const level = levels.find((l) => l.id === r.levelId);
  if (
    !level ||
    r.levelId > p.highestUnlockedLevel ||
    p.claimedRuns.includes(r.runId) ||
    !Number.isFinite(r.score) ||
    r.score < 0
  )
    return p;
  const s = stars(r.score, level.targetScore);
  if (!s) return p;
  return {
    ...p,
    coins: p.coins + rewardFor(p, r),
    highestUnlockedLevel: Math.max(
      p.highestUnlockedLevel,
      Math.min(levels.length, r.levelId + 1),
    ),
    stars: { ...p.stars, [r.levelId]: Math.max(p.stars[r.levelId] ?? 0, s) },
    claimedRuns: [...p.claimedRuns, r.runId],
  };
}
export function purchaseUpgrade(
  p: PlayerProgress,
  c: Category,
): PlayerProgress {
  const l = p.equipment[c],
    cost = upgradeCosts[l - 1];
  if (!p.ownedEquipment.includes(c) || cost === undefined || p.coins < cost)
    return p;
  return {
    ...p,
    coins: p.coins - cost,
    equipment: { ...p.equipment, [c]: l + 1 },
  };
}
