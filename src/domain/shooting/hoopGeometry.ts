import type { LevelConfig } from "../../data/levels";
import { hoopLayout } from "../../data/hoop";
/** Screen-space frame collision geometry for the front-facing 2D court. */
export function getHoopGeometry(level: LevelConfig) {
  return {
    ...hoopLayout,
    boardTopY: level.hoopY + hoopLayout.boardTopOffset,
    boardSideY: level.hoopY - 39,
    boardSideHeight: 108,
  };
}
