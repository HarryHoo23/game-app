import { icon, type IconName } from "./icons";
export const coinDisplay = (coins: number) =>
  `<span class="coin-display" aria-label="${coins} coins"><span class="coin-medallion" aria-hidden="true">${icon("ball")}</span><span>${coins}</span></span>`;
export const gameButton = (
  label: string,
  action: string,
  style: "primary" | "secondary",
  glyph: IconName,
) => `<button class="${style}" data-${action}>${label}${icon(glyph)}</button>`;
export const statDisplay = (
  label: string,
  value: number,
  attribute: string,
  extra = "",
) =>
  `<div class="hud-panel ${extra}"><span class="stat-label">${label}</span><strong ${attribute}>${value}</strong></div>`;
export const progressBar = () =>
  '<div class="target-track" aria-label="Target progress"><i data-progress></i></div>';
