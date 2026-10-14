import {
  initialProgress,
  type PlayerProgress,
} from "../domain/progression/progress";
import { categories } from "../data/equipment";
export const SAVE_KEY = "afterhours.progress.v1";
type StoragePort = Pick<Storage, "getItem" | "setItem">;
const integer = (n: unknown, min: number, max = Number.MAX_SAFE_INTEGER) =>
  typeof n === "number" && Number.isSafeInteger(n) && n >= min && n <= max;
function valid(v: unknown): v is PlayerProgress {
  if (!v || typeof v !== "object") return false;
  const p = v as PlayerProgress;
  return (
    p.schemaVersion === 1 &&
    integer(p.coins, 0) &&
    integer(p.highestUnlockedLevel, 1, 10) &&
    !!p.stars &&
    Object.entries(p.stars).every(
      ([k, s]) => integer(Number(k), 1, 10) && integer(s, 0, 3),
    ) &&
    !!p.equipment &&
    categories.every((c) => integer(p.equipment[c], 1, 5)) &&
    Array.isArray(p.ownedEquipment) &&
    categories.every((c) => p.ownedEquipment.includes(c)) &&
    !!p.equipped &&
    categories.every((c) => p.equipped[c] === c) &&
    Array.isArray(p.claimedRuns) &&
    p.claimedRuns.every((r) => typeof r === "string")
  );
}
export class ProgressStore {
  private future = false;
  warning = "";
  constructor(private storage: StoragePort) {}
  load(): PlayerProgress {
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      if (!raw) return initialProgress();
      const value = JSON.parse(raw);
      if (value?.schemaVersion > 1) {
        this.future = true;
        throw Error(
          "This save belongs to a newer version. Saving is disabled.",
        );
      }
      if (!valid(value))
        throw Error("Save could not be read. Starting a fresh session.");
      return value;
    } catch (e) {
      this.warning = e instanceof Error ? e.message : "Storage unavailable";
      return initialProgress();
    }
  }
  save(p: PlayerProgress) {
    if (this.future)
      throw Error("Newer save protected. Progress was not saved.");
    if (!valid(p)) throw Error("Invalid progress");
    this.storage.setItem(SAVE_KEY, JSON.stringify(p));
  }
}
