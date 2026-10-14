export const categories = ["shoes", "sleeve", "ball", "hoop"] as const;
export type Category = (typeof categories)[number];
export const upgradeCosts = [100, 250, 500, 1000];
export const equipment = {
  shoes: {
    name: "Court runners",
    category: "Basketball shoes",
    icon: "↗",
    description: "Steadier hands. Same skill.",
    bonus: (l: number) => `${(l - 1) * 5}% input smoothing`,
  },
  sleeve: {
    name: "Flow sleeve",
    category: "Arm sleeve",
    icon: "≋",
    description: "A little more room for perfect.",
    bonus: (l: number) => `${6 + (l - 1) * 2}px perfect window`,
  },
  ball: {
    name: "Asphalt original",
    category: "Basketball",
    icon: "◉",
    description: "Find your power sweet spot.",
    bonus: (l: number) => `${(l - 1) * 4}% power control`,
  },
  hoop: {
    name: "Chain reaction",
    category: "Hoop & net",
    icon: "⌑",
    description: "Make every bucket pay.",
    bonus: (l: number) => `+${(l - 1) * 5}% completion coins`,
  },
};
