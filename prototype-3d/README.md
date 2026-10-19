# AFTER HOURS — 3D practice prototype

An isolated React/Three/Rapier experiment. The Phaser app in the parent folder remains independent.

```sh
cd prototype-3d
npm ci
npm run dev
```

Open http://localhost:5174. Recommended Node.js 22+ (Drei's optional camera-controls dependency requires it).

`npm test`, `npm run lint`, `npm run build`; `npm run preview` serves port 4174.
Gameplay tuning is centralized in `src/config.ts`. Initial milestone under development.
