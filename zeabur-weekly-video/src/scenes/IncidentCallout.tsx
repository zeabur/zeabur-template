import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";
import type { Report } from "../types";

export const IncidentScene: React.FC<{ report: Report }> = ({ report }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 24 });
  const incidents = report.incidents;
  const open = incidents.filter((i) => !i.resolved).length;
  const resolved = incidents.length - open;

  // Subtle amber pulse on the badge.
  const pulse = 0.5 + 0.5 * Math.sin(frame / 6);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        justifyContent: "center",
        alignItems: "center",
        padding: "0 160px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1400,
          backgroundColor: theme.bgElevated,
          border: `1px solid ${theme.amber}55`,
          borderRadius: 28,
          padding: 64,
          transform: `scale(${interpolate(enter, [0, 1], [0.94, 1])})`,
          opacity: enter,
          boxShadow: `0 0 90px -30px ${theme.amber}aa`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 30 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              backgroundColor: theme.amber,
              boxShadow: `0 0 ${10 + pulse * 18}px ${theme.amber}`,
            }}
          />
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: 26,
              letterSpacing: 6,
              color: theme.amber,
              textTransform: "uppercase",
            }}
          >
            Support / Incidents
          </div>
        </div>

        <div style={{ display: "flex", gap: 80, alignItems: "flex-end" }}>
          <div>
            <div
              style={{
                fontFamily: theme.fontMono,
                fontSize: 160,
                fontWeight: 700,
                color: theme.amber,
                lineHeight: 1,
              }}
            >
              {String(incidents.length).padStart(2, "0")}
            </div>
            <div style={{ fontSize: 30, color: theme.textDim, marginTop: 10 }}>
              SUP tickets handled
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingBottom: 12 }}>
            <Stat color={theme.teal} value={resolved} label="closed" />
            <Stat color={theme.amber} value={open} label="still open" />
          </div>
        </div>

        {incidents[0] && (
          <div
            style={{
              marginTop: 44,
              paddingTop: 28,
              borderTop: `1px solid ${theme.line}`,
              fontSize: 30,
              color: theme.text,
            }}
          >
            <span style={{ fontFamily: theme.fontMono, color: theme.amber }}>
              {incidents[0].id}
            </span>{" "}
            {incidents[0].title}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

const Stat: React.FC<{ color: string; value: number; label: string }> = ({
  color,
  value,
  label,
}) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
    <div style={{ fontFamily: theme.fontMono, fontSize: 56, fontWeight: 700, color }}>
      {value}
    </div>
    <div style={{ fontSize: 28, color: theme.textDim }}>{label}</div>
  </div>
);
