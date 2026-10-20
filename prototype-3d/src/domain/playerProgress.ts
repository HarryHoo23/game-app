type StorageAccess = () => Pick<Storage, "getItem" | "setItem"> | undefined;
export const BEST_KEY = "afterhours3d-five-spot-best";
export const TUTORIAL_KEY = "afterhours3d-swipe-learned";

/** Keep a session-memory fallback even when the storage getter or writes fail. */
export function createPlayerProgress(
  access: StorageAccess = () => globalThis.localStorage,
) {
  let best = 0,
    learned = false;
  const read = (key: string) => {
    try {
      return access()?.getItem(key);
    } catch {
      return null;
    }
  };
  const write = (key: string, value: string) => {
    try {
      access()?.setItem(key, value);
    } catch {
      /* Play continues in memory. */
    }
  };
  const readBest = () => {
    const value = read(BEST_KEY);
    const parsed = value && /^\d+$/.test(value) ? Number(value) : 0;
    if (Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 10)
      best = Math.max(best, parsed);
    return best;
  };
  return {
    readBest,
    recordBest(score: number) {
      readBest();
      if (Number.isSafeInteger(score) && score > best && score <= 10) {
        best = score;
        write(BEST_KEY, String(best));
      }
      return best;
    },
    hasLearnedSwipe() {
      learned ||= read(TUTORIAL_KEY) === "1";
      return learned;
    },
    learnSwipe() {
      if (!learned) {
        learned = true;
        write(TUTORIAL_KEY, "1");
      }
    },
  };
}
