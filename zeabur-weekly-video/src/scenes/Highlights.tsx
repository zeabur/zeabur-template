import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";
import type { Highlight, Report } from "../types";

const Row: React.FC<{ item: Highlight; index: number }> = ({ item, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = 16 + index * 9;
  const enter = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
    durationInFrames: 26,
  });
  const x = interpolate(enter, [0, 1], [-60, 0]);
  const color = theme.bucket[item.bucket];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 26,
        opacity: enter,
        transform: `translateX(${x}px)`,
        backgroundColor: theme.bgElevated,
        border: `1px solid ${theme.line}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 16,
        padding: "22px 30px",
      }}
    >
      <div
        style={{
          fontFamily: theme.fontMono,
          fontSize: 30,
          fontWeight: 700,
          color: theme.purple,
          minWidth: 150,
        }}
      >
        {item.id}
      </div>
      <div
        style={{
          flex: 1,
          fontSize: 34,
          color: theme.text,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {item.title}
      </div>
      <div
        style={{
          fontSize: 24,
          color,
          fontFamily: theme.fontMono,
          textTransform: "uppercase",
          letterSpacing: 1,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {item.resolved && <span style={{ color: theme.teal, fontSize: 26 }}>✓</span>}
        {item.state}
      </div>
    </div>
  );
};

export const HighlightsScene: React.FC<{ report: Report }> = ({ report }) => {
  const frame = useCurrentFrame();
  const headerOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });
  // Show the most relevant highlights that fit the frame.
  const items = report.highlights.slice(0, 7);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        padding: "100px 110px",
        justifyContent: "center",
      }}
    >
      <div style={{ opacity: headerOpacity, marginBottom: 44 }}>
        <div
          style={{
            fontFamily: theme.fontMono,
            fontSize: 24,
            letterSpacing: 6,
            color: theme.purple,
            textTransform: "uppercase",
          }}
        >
          Highlights
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, color: theme.text, marginTop: 10 }}>
          Notable issues
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {items.length > 0 ? (
          items.map((h, i) => <Row key={h.id} item={h} index={i} />)
        ) : (
          <div style={{ fontSize: 36, color: theme.textDim }}>
            No product issues this week — all support.
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
