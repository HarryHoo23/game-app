import { writeFileSync } from "node:fs";
import { createShot, assessShot } from "../src/domain/shooting/ShotTrajectory";
import { HoopPass } from "../src/game/hoop/HoopPass";
import {
  calculateStats,
  initialProgress,
} from "../src/domain/progression/progress";
import { levels } from "../src/data/levels";
import { shotFeel } from "../src/data/shotFeel";
import { humanGestures } from "./lib/humanized";
const gestures = humanGestures(),
  level = levels[0],
  stats = calculateStats(initialProgress());
const counts = {
  normal: 0,
  swish: 0,
  perfect: 0,
  frontRim: 0,
  backRim: 0,
  backboard: 0,
  airball: 0,
};
const samples = gestures.map((gesture) => {
  const plan = createShot(gesture.dx, gesture.dy, level, stats)!;
  const result = assessShot(plan, level, stats);
  let made = false;
  if (result.made) {
    const pass = new HoopPass(level);
    pass.start(plan, result);
    while (pass.active) made = pass.advance(1000 / 120).scored || made;
  }
  const classification = made
    ? result.quality
    : result.impact === "none"
      ? "airball"
      : result.impact;
  counts[classification as keyof typeof counts]++;
  return {
    gesture,
    target: plan.target,
    power: plan.power,
    classification,
    made,
    predictedImpact: result.impact,
  };
});
const total = gestures.length,
  percentage = Object.fromEntries(
    Object.entries(counts).map(([key, value]) => [key, (value / total) * 100]),
  ),
  makeCount = counts.normal + counts.swish + counts.perfect;
const report = {
  seed: "0x4f18",
  total,
  distribution:
    "triangular horizontal -25..25; vertical125..170 centered147.5; visible ball starts±24x±12y; fixed identical gestures BEFORE/AFTER",
  equipment: initialProgress().equipment,
  makeCount,
  makePercent: (makeCount / total) * 100,
  counts,
  percentage,
  classificationNote:
    "Make requires complete ordered HoopPass. Miss categories are predicted domain impacts, not residual Matter contact telemetry.",
  inputConfig: shotFeel,
  samples,
};
if (process.argv[2])
  writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify({
    total,
    makePercent: report.makePercent,
    counts,
    percentage,
  }),
);
