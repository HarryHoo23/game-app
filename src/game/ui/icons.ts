const paths = {
  arrow: "M5 19 19 5M5 5h14v14",
  levels: "M5 19v-5m7 5V5m7 14V9",
  shirt: "m8 4-5 3 3 5 2-1v9h8v-9l2 1 3-5-5-3c-1 3-7 3-8 0Z",
  pause: "M9 6v12M15 6v12",
  sound: "m4 9 4 0 5-4v14l-5-4H4Zm13-2c3 3 3 7 0 10",
  ball: "M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20Zm-10 10h20M12 2v20M5 5c8 1 8 13 0 14M19 5c-8 1-8 13 0 14",
};
export type IconName = keyof typeof paths;
export const icon = (name: IconName) =>
  `<svg class="ah-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
