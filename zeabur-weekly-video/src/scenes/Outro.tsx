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

export const OutroScene: React.FC<{ report: Report }> = ({ report }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 26 });
  const rate =
    report.stats.total > 0
      ? Math.round((report.stats.resolved / report.stats.total) * 100)
      : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <TicketTape tickets={report.tickets} />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(14,16,24,0) 0%, rgba(14,16,24,0.88) 70%)",
        }}
      />
      <AbsoluteFill
        style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}
      >
        <div style={{ opacity: enter, transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)` }}>
          <div
            style={{
              fontFamily: theme.fontMono,
              fontSize: 28,
              letterSpacing: 8,
              color: theme.teal,
              textTransform: "uppercase",
              marginBottom: 28,
            }}
          >
            That's a wrap
          </div>
          <div style={{ fontSize: 96, fontWeight: 800, color: theme.text, lineHeight: 1.1 }}>
            <span style={{ color: theme.teal, fontFamily: theme.fontMono }}>
              {report.stats.resolved}
            </span>{" "}
            resolved
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 40,
              color: theme.textDim,
              fontFamily: theme.fontMono,
            }}
          >
            {rate}% close rate · {report.window.label}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
