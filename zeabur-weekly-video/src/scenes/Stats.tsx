import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";
import type { Report, StateBucket } from "../types";

const CARDS: { key: StateBucket; label: string }[] = [
  { key: "resolved", label: "Resolved" },
  { key: "inProgress", label: "In Progress" },
  { key: "triage", label: "Triage" },
  { key: "waiting", label: "Waiting" },
];

const StatCard: React.FC<{
  label: string;
  value: number;
  color: string;
  index: number;
}> = ({ label, value, color, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = 10 + index * 10;

  const appear = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
    durationInFrames: 24,
  });
  // Count animation runs over ~40 frames after the card appears.
  const progress = interpolate(frame, [delay, delay + 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const display = Math.round(value * progress);

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: theme.bgElevated,
        border: `1px solid ${theme.line}`,
        borderRadius: 24,
        padding: "44px 36px",
        transform: `translateY(${interpolate(appear, [0, 1], [50, 0])}px)`,
        opacity: appear,
        boxShadow: `0 0 0 1px ${color}22, 0 30px 60px -30px ${color}55`,
      }}
    >
      <div style={{ height: 6, width: 64, borderRadius: 3, backgroundColor: color }} />
      <div
        style={{
          fontFamily: theme.fontMono,
          fontSize: 130,
          fontWeight: 700,
          color: theme.text,
          marginTop: 18,
          lineHeight: 1,
        }}
      >
        {String(display).padStart(2, "0")}
      </div>
      <div
        style={{
          marginTop: 16,
          fontSize: 30,
          color: theme.textDim,
          letterSpacing: 1,
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const StatsScene: React.FC<{ report: Report }> = ({ report }) => {
  const frame = useCurrentFrame();
  const headerOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        padding: "120px 110px",
        justifyContent: "center",
      }}
    >
      <div style={{ opacity: headerOpacity, marginBottom: 60 }}>
        <div
          style={{
            fontFamily: theme.fontMono,
            fontSize: 24,
            letterSpacing: 6,
            color: theme.purple,
            textTransform: "uppercase",
          }}
        >
          This Week in Numbers
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, color: theme.text, marginTop: 10 }}>
          {report.stats.total} issues touched
        </div>
      </div>
      <div style={{ display: "flex", gap: 32 }}>
        {CARDS.map((c, i) => (
          <StatCard
            key={c.key}
            index={i}
            label={c.label}
            value={report.stats[c.key]}
            color={theme.bucket[c.key]}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
