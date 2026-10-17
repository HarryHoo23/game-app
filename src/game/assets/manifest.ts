import basketball from "../../assets/hoop/basketball.png";
import backboard from "../../assets/hoop/backboard.png";
import rimBack from "../../assets/hoop/rim_back.png";
import net from "../../assets/hoop/net.png";
import nightCourt from "../../assets/background/night-court.webp";
export const assets = {
  nightCourt: { key: "court-night", url: nightCourt },
  hoop: {
    backboard: { key: "hoop-backboard", url: backboard },
    rimBack: { key: "hoop-rim-back", url: rimBack },
    net: { key: "hoop-net", url: net },
    rimFront: { key: "hoop-rim-back", url: rimBack },
  },
  ball: { key: "ball", url: basketball },
  spark: { key: "spark" },
} as const;
