import Phaser from "phaser";
import { theme } from "../themes/theme";
/** A local, deterministic pebble-grain ball; no image service or remote asset required. */
export function createBallTexture(scene: Phaser.Scene) {
  const size = 512,
    r = 244,
    c = 256;
  const texture = scene.textures.createCanvas("ball", size, size)!;
  const ctx = texture.context;
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.clip();
  const skin = ctx.createRadialGradient(168, 135, 10, 240, 246, 310);
  skin.addColorStop(0, "#f5af65");
  skin.addColorStop(0.38, "#d67431");
  skin.addColorStop(0.72, "#a94920");
  skin.addColorStop(1, "#381d16");
  ctx.fillStyle = skin;
  ctx.fillRect(0, 0, size, size);
  let seed = 87;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let row = 0; row < 120; row++)
    for (let col = 0; col < 120; col++) {
      const x = col * 4.4 + (row % 2) * 2.2 + (random() - 0.5) * 1.2,
        y = row * 4.4 + (random() - 0.5) * 1.2;
      if (Math.hypot(x - c, y - c) > r) continue;
      const radius = 0.7 + random() * 0.9;
      ctx.fillStyle = `rgba(38,17,9,${0.13 + random() * 0.19})`;
      ctx.beginPath();
      ctx.ellipse(x, y, radius, radius * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,212,141,.19)";
      ctx.beginPath();
      ctx.ellipse(x - 0.3, y - 0.5, radius * 0.65, 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  const seams = [
    [
      [8, 210],
      [170, 284],
      [350, 267],
      [507, 177],
    ],
    [
      [210, 8],
      [305, 163],
      [340, 325],
      [293, 507],
    ],
    [
      [332, 11],
      [53, 108],
      [55, 365],
      [349, 500],
    ],
    [
      [454, 69],
      [284, 220],
      [274, 418],
      [401, 465],
    ],
  ];
  ctx.lineCap = "round";
  for (const seam of seams) {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(...(seam[0] as [number, number]));
      ctx.bezierCurveTo(
        ...(seam.slice(1).flat() as [
          number,
          number,
          number,
          number,
          number,
          number,
        ]),
      );
    };
    path();
    ctx.strokeStyle = "rgba(250,166,86,.65)";
    ctx.lineWidth = 13;
    ctx.stroke();
    ctx.save();
    ctx.translate(1.5, 2);
    path();
    ctx.strokeStyle = "#251d18";
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.restore();
    path();
    ctx.strokeStyle = "#3e2920";
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  const shade = ctx.createLinearGradient(0, 0, 512, 512);
  shade.addColorStop(0, "rgba(255,220,145,.15)");
  shade.addColorStop(0.5, "rgba(2,13,17,0)");
  shade.addColorStop(1, "rgba(2,13,17,.64)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
  ctx.strokeStyle = theme.colors.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.stroke();
  texture.refresh();
}
