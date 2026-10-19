export type Vec3 = { x: number; y: number; z: number };
export type Sample = { position: Vec3; velocity: Vec3; time: number };
export type Contact = { kind: 'rim' | 'board' | 'floor'; time: number; position: Vec3 };
