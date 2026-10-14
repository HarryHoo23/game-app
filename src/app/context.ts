import { ProgressStore } from "../services/storage";
import {
  initialProgress,
  completeLevel,
  purchaseUpgrade,
  rewardFor,
  type PlayerProgress,
  type LevelResult,
} from "../domain/progression/progress";
import type { Category } from "../data/equipment";
import { AudioService, BrowserHaptics } from "../services/feedback";
export class AppContext {
  progress: PlayerProgress = initialProgress();
  readonly audio = new AudioService();
  readonly haptics = new BrowserHaptics();
  private store: ProgressStore;
  constructor() {
    let storage: Pick<Storage, "getItem" | "setItem">;
    try {
      storage = window.localStorage;
    } catch {
      storage = {
        getItem: () => {
          throw Error(
            "Storage unavailable. Progress lasts for this session only.",
          );
        },
        setItem: () => {
          throw Error("Progress was not saved. Storage unavailable.");
        },
      };
    }
    this.store = new ProgressStore(storage);
    this.progress = this.store.load();
    if (this.store.warning) this.notify(this.store.warning);
  }
  private update(next: PlayerProgress) {
    if (next === this.progress) return;
    this.progress = next;
    try {
      this.store.save(next);
    } catch {
      this.notify("Progress was not saved. Please keep this tab open.");
    }
  }
  complete(result: LevelResult) {
    const next = completeLevel(this.progress, result);
    const coins = next.coins - this.progress.coins;
    this.update(next);
    return coins;
  }
  upgrade(category: Category) {
    this.update(purchaseUpgrade(this.progress, category));
  }
  previewReward(result: LevelResult) {
    return rewardFor(this.progress, result);
  }
  notify(message: string) {
    const el = document.querySelector<HTMLElement>("#notice");
    if (el) {
      el.textContent = message;
      el.classList.add("visible");
    }
  }
}
