import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";
import type { Report, TeamGroup } from "../types";

const Bar: React.FC<{ team: TeamGroup; max: number; index: number }> = ({
  team,
  max,
  index,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = 14 + index * 8;

  const grow = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
    durationInFrames: 30,
  });
  const fullW = (team.count / max) * 100;
  const width = fullW * grow;
  const resolvedRatio = team.count > 0 ? team.resolved / team.count : 0;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, opacity: grow }}>
      <div
        style={{
          width: 120,
          textAlign: "right",
          fontFamily: theme.fontMono,
          fontSize: 34,
          fontWeight: 700,
          color: theme.purple,
        }}
      >
        {team.key}
      </div>
      <div
        style={{
          flex: 1,
          height: 52,
          backgroundColor: theme.bgElevated,
          borderRadius: 12,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${width}%`,
            background: `linear-gradient(90deg, ${theme.purple}, ${theme.purple}cc)`,
            borderRadius: 12,
          }}
        >
          {/* Resolved portion overlaid in teal */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${resolvedRatio * 100}%`,
              background: `linear-gradient(90deg, ${theme.teal}, ${theme.teal}cc)`,
              borderRadius: 12,
            }}
          />
        </div>
      </div>
      <div
        style={{
          width: 130,
          fontFamily: theme.fontMono,
          fontSize: 32,
          color: theme.text,
        }}
      >
        {Math.round(team.count * grow)}
        <span style={{ color: theme.teal, fontSize: 24 }}>
          {" "}
          ✓{Math.round(team.resolved * grow)}
        </span>
      </div>
    </div>
  );
};

export const TeamBarsScene: React.FC<{ report: Report }> = ({ report }) => {
  const frame = useCurrentFrame();
  const headerOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });
  const teams = [...report.teams].sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...teams.map((t) => t.count));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        padding: "120px 110px",
        justifyContent: "center",
      }}
    >
      <div style={{ opacity: headerOpacity, marginBottom: 56 }}>
        <div
          style={{
            fontFamily: theme.fontMono,
            fontSize: 24,
            letterSpacing: 6,
            color: theme.purple,
            textTransform: "uppercase",
          }}
        >
          By Team
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, color: theme.text, marginTop: 10 }}>
          Where the work landed
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        {teams.map((t, i) => (
          <Bar key={t.key} team={t} max={max} index={i} />
        ))}
      </div>
      <div
        style={{
          marginTop: 48,
          display: "flex",
          gap: 32,
          fontSize: 26,
          color: theme.textDim,
        }}
      >
        <Legend color={theme.purple} label="Total" />
        <Legend color={theme.teal} label="Resolved" />
      </div>
    </AbsoluteFill>
  );
};

const Legend: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: color }} />
    {label}
  </div>
);
