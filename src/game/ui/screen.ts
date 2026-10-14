import Phaser from "phaser";
export function screen(
  scene: Phaser.Scene,
  html: string,
  className = "screen",
) {
  const root = document.getElementById("ui")!;
  root.innerHTML = "";
  const el = document.createElement("section");
  el.className = className;
  el.innerHTML = html;
  root.append(el);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => el.remove());
  return el;
}
export function on(el: HTMLElement, selector: string, fn: () => void) {
  el.querySelector(selector)?.addEventListener("click", fn);
}
export const starText = (n: number) => "★".repeat(n) + "☆".repeat(3 - n);
export const topbar = (title: string, coins: number) =>
  `<header class="topbar"><button class="icon-button" data-back aria-label="Back">←</button><span class="eyebrow">${title}</span><span class="coins"><i>●</i> ${coins}</span></header>`;
