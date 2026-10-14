/** Shared presentation tokens. Gameplay tuning lives separately in src/data. */
export const theme = {
  colors: {
    background: "#071c22",
    surface: "#0b252b",
    raised: "#102d33",
    mint: "#a9f3d3",
    cream: "#f1f2e4",
    orange: "#e7792f",
    amber: "#f5b56a",
    muted: "#91a9ad",
    edge: "#31545e",
    ink: "#031419",
    net: "#dedfd0",
  },
  typography: {
    display: '"Barlow Condensed", Impact, sans-serif',
    ui: '"Barlow", sans-serif',
    brush: '"Permanent Marker", cursive',
  },
  spacing: { page: "6cqw", gap: "3cqw" },
  radii: { button: "1.6cqw", panel: "2.3cqw" },
  shadows: { panel: "0 10px 35px #03141938", button: "0 4px 24px #a9f3d30d" },
  motion: { press: 120, enter: 420, score: 1100 },
} as const;
export const colorNumber = (name: keyof typeof theme.colors) =>
  Number.parseInt(theme.colors[name].slice(1), 16);
export function installTheme() {
  const css = document.documentElement.style;
  for (const [key, value] of Object.entries(theme.colors))
    css.setProperty(`--ah-${key}`, value);
  for (const [key, value] of Object.entries(theme.typography))
    css.setProperty(`--ah-font-${key}`, value);
  for (const [key, value] of Object.entries(theme.spacing))
    css.setProperty(`--ah-space-${key}`, value);
  for (const [key, value] of Object.entries(theme.radii))
    css.setProperty(`--ah-radius-${key}`, value);
  for (const [key, value] of Object.entries(theme.shadows))
    css.setProperty(`--ah-shadow-${key}`, value);
  css.setProperty("--ah-enter", `${theme.motion.enter}ms`);
  css.setProperty("--ah-press", `${theme.motion.press}ms`);
}
