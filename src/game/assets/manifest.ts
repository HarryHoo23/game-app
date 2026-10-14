import hoopBoard from "../../assets/hoop/hoop-board.png";
import nightCourt from "../../assets/background/night-court.webp";
export const assets = {
  nightCourt: { key: "court-night", url: nightCourt },
  hoop: { key: "hoop-front", url: hoopBoard },
  ball: { key: "ball" },
  spark: { key: "spark" },
} as const;
