import { physics } from "./physics";
export interface LevelConfig {
  id: number;
  name: string;
  targetScore: number;
  totalShots: number;
  rewardCoins: number;
  hoopX: number;
  hoopY: number;
  scoreMultiplier: number;
}
const entries: [string, number, number, number][] = [
  ["First light", 10, 10, 285],
  ["Find your rhythm", 16, 10, 280],
  ["Nothing but net", 24, 12, 265],
  ["Across the block", 24, 11, 285],
  ["Higher ground", 26, 12, 245],
  ["Golden hour", 28, 12, 265],
  ["Stay focused", 24, 10, 260],
  ["Under pressure", 30, 12, 240],
  ["Night shift", 32, 12, 250],
  ["Own the court", 36, 14, 235],
];
export const levels: LevelConfig[] = entries.map(
  ([name, targetScore, totalShots, hoopY], i) => ({
    id: i + 1,
    name,
    targetScore,
    totalShots,
    hoopX: physics.width / 2,
    hoopY,
    rewardCoins: 60 + i * 15,
    scoreMultiplier: 1,
  }),
);
