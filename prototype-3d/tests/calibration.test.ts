import { beforeAll, it, expect } from "vitest";
import { config } from "../src/config";
import { shootingSpots } from "../src/domain/spots";
import { initPhysics } from "./helpers/rapierWorld";
import { sensitivityShot } from "./helpers/sensitivity";
import { launchTuningPresets } from "../src/tuning";
beforeAll(initPhysics);
it("moderate response keeps ordinary swipes physical makes and lets weak/strong swipes fail", () => {
  const previous = {
    ...config,
    launch: { ...config.launch, ...launchTuningPresets.moderate },
  };
  for (const spot of shootingSpots) {
    expect(sensitivityShot(previous, spot, 0.3, 0.01).result).toBe("swish");
    expect(sensitivityShot(previous, spot, 0.4, 0).made).toBe(false);
  }
});

it("optional rim geometry remains shared by the visible torus, physical segments and net attachment", async () => {
  const { rimGeometry, netGeometry } = await import("../src/scene/artGeometry");
  const { createRimSegments } = await import("../src/scene/geometry");
  for (const innerRadius of [0.232, 0.229]) {
    const c = { ...config, hoop: { ...config.hoop, innerRadius } },
      rim = rimGeometry(c),
      net = netGeometry(c),
      segments = createRimSegments(c);
    expect(rim.parameters.radius - rim.parameters.tube).toBeCloseTo(
      innerRadius,
      9,
    );
    expect(Math.hypot(net.base[0], net.base[2])).toBeCloseTo(
      rim.parameters.radius,
      6,
    );
    const first = segments[0].a;
    expect(
      Math.hypot(first.x - c.hoop.center.x, first.z - c.hoop.center.z),
    ).toBeCloseTo(rim.parameters.radius, 9);
    rim.dispose();
    net.geometry.dispose();
  }
});
