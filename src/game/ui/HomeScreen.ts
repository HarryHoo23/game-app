import type { PlayerProgress } from "../../domain/progression/progress";
import { coinDisplay, gameButton } from "./components";
import { icon } from "./icons";
export function homeScreen(progress: PlayerProgress, sound: boolean) {
  return `
<header class="brand"><span class="brand-mark">a<span>h</span>${icon("arrow")}</span><span class="eyebrow">PICK UP.<br>TUNE IN.</span>${coinDisplay(progress.coins)}</header>
<div class="home-copy"><div class="pill"><span></span> THE COURT IS YOURS</div><h1>AFTER<br><em>HOURS.</em></h1><p>One court. One more shot.</p><span class="edition">STREET BASKETBALL / VOL. 01</span></div>
<div class="home-bottom"><div class="progress-label"><span>YOUR NEXT RUN</span><span>COURT ${String(progress.highestUnlockedLevel).padStart(2, "0")} / 10</span></div>
${gameButton("Hit the court", "play", "primary", "arrow")}
<div class="menu-row">${gameButton("Choose a level", "levels", "secondary", "levels")}${gameButton("My equipment", "gear", "secondary", "shirt")}</div>
<footer><span>DRAG. RELEASE. REPEAT.</span><button class="text-button" data-sound aria-label="Toggle sound"><span data-sound-label>SOUND ${sound ? "ON" : "OFF"}</span>${icon("sound")}</button></footer></div>`;
}
