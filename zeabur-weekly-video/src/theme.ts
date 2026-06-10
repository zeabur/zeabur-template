/**
 * Dark theme tokens shared across every scene.
 */
export const theme = {
  bg: "#0E1018",
  bgElevated: "#171A24",
  purple: "#8B7CF6",
  teal: "#3DD6A3",
  amber: "#F5A524",
  text: "#E6E8EF",
  textDim: "#8A8F9E",
  line: "#262A38",
  // Map a state bucket to its accent colour.
  bucket: {
    resolved: "#3DD6A3",
    inProgress: "#8B7CF6",
    triage: "#F5A524",
    waiting: "#8A8F9E",
  } as const,
  fontSans:
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontMono:
    '"SF Mono", "JetBrains Mono", "Fira Code", ui-monospace, Menlo, Consolas, monospace',
} as const;

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 840;

/** Scene layout in absolute frames (must sum to DURATION). */
export const scenes = {
  title: { from: 0, durationInFrames: 120 },
  stats: { from: 120, durationInFrames: 180 },
  teams: { from: 300, durationInFrames: 180 },
  highlights: { from: 480, durationInFrames: 180 },
  incident: { from: 660, durationInFrames: 90 },
  outro: { from: 750, durationInFrames: 90 },
} as const;
