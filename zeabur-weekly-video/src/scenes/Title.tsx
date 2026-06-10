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
import { TicketTape } from "../components/TicketTape";

export const TitleScene: React.FC<{ report: Report }> = ({ report }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 });
  const y = interpolate(enter, [0, 1], [40, 0]);
  const subOpacity = interpolate(frame, [18, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <TicketTape tickets={report.tickets} />
      {/* Radial vignette to keep focus on the title */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(14,16,24,0) 0%, rgba(14,16,24,0.85) 70%)",
        }}
      />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div style={{ transform: `translateY(${y}px)`, opacity: enter }}>
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: 28,
              letterSpacing: 8,
              color: theme.purple,
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            Weekly Report
          </div>
          <div style={{ fontSize: 120, fontWeight: 800, color: theme.text, lineHeight: 1.05 }}>
            {report.assignee}
          </div>
        </div>
        <div
          style={{
            marginTop: 36,
            opacity: subOpacity,
            fontFamily: theme.fontMono,
            fontSize: 34,
            color: theme.textDim,
          }}
        >
          {report.window.label}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
