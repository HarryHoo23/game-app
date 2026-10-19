import RAPIER from "@dimforge/rapier3d-compat";
import { BALL_GROUPS, COURT_GROUPS, type GameConfig } from "../../src/config";
import { createRimSegments } from "../../src/scene/geometry";
import type { Contact, Vec3 } from "../../src/domain/types";
export const initPhysics = async () => {
  await RAPIER.init();
};
export function createTestWorld(c: GameConfig, origin: Vec3 = c.ball.origin) {
  const world = new RAPIER.World({ x: 0, y: -c.gravity, z: 0 });
  world.timestep = c.timeStep;
  const queue = new RAPIER.EventQueue(true),
    kinds = new Map<number, Contact["kind"]>();
  const add = (d: RAPIER.ColliderDesc, kind: Contact["kind"]) => {
    d.setCollisionGroups(COURT_GROUPS).setActiveEvents(
      RAPIER.ActiveEvents.COLLISION_EVENTS,
    );
    const collider = world.createCollider(d);
    kinds.set(collider.handle, kind);
  };
  for (const s of createRimSegments(c))
    add(
      RAPIER.ColliderDesc.capsule(s.halfLength, c.hoop.tubeRadius)
        .setTranslation(s.center.x, s.center.y, s.center.z)
        .setRotation(s.rotation)
        .setRestitution(c.hoop.restitution),
      "rim",
    );
  const b = c.board;
  add(
    RAPIER.ColliderDesc.cuboid(b.size.x / 2, b.size.y / 2, b.size.z / 2)
      .setTranslation(b.center.x, b.center.y, b.center.z)
      .setRestitution(b.restitution),
    "board",
  );
  add(
    RAPIER.ColliderDesc.cuboid(c.court.width / 2, 0.05, c.court.length / 2)
      .setTranslation(0, -0.05, c.court.centerZ)
      .setRestitution(c.court.floorRestitution),
    "floor",
  );
  const ball = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(origin.x, origin.y, origin.z)
      .setCcdEnabled(true),
  );
  world.createCollider(
    RAPIER.ColliderDesc.ball(c.ball.radius)
      .setMass(c.ball.mass)
      .setRestitution(c.ball.restitution)
      .setFriction(c.ball.friction)
      .setCollisionGroups(BALL_GROUPS)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    ball,
  );
  const contacts: (Contact & { before: Vec3; after: Vec3 })[] = [];
  let time = 0;
  return {
    world,
    ball,
    contacts,
    step() {
      const before = { ...ball.linvel() };
      world.step(queue);
      time += c.timeStep;
      queue.drainCollisionEvents((a, b, started) => {
        if (started) {
          const kind = kinds.get(a) ?? kinds.get(b);
          if (kind)
            contacts.push({
              kind,
              time,
              position: { ...ball.translation() },
              before,
              after: { ...ball.linvel() },
            });
        }
      });
      return {
        position: { ...ball.translation() },
        velocity: { ...ball.linvel() },
        time,
      };
    },
    dispose() {
      queue.free();
      world.free();
    },
  };
}
