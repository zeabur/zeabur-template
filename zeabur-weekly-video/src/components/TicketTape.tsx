import React from "react";
import { useCurrentFrame } from "remotion";
import { theme } from "../theme";

interface TapeTicket {
  id: string;
  resolved: boolean;
}

/**
 * A vertically scrolling "tape" of ticket identifiers used as the moving
 * background on the Title and Outro scenes. Resolved tickets get a bright
 * teal check mark. The list is duplicated so the scroll loops seamlessly.
 */
export const TicketTape: React.FC<{
  tickets: TapeTicket[];
  columns?: number;
  speed?: number;
  rowHeight?: number;
}> = ({ tickets, columns = 5, speed = 0.6, rowHeight = 64 }) => {
  const frame = useCurrentFrame();

  // Guarantee enough rows to fill a column even with very few tickets.
  const source = tickets.length > 0 ? tickets : [{ id: "—", resolved: false }];
  const perColumn = Math.max(12, Math.ceil(source.length / columns));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        justifyContent: "space-between",
        padding: "0 80px",
        opacity: 0.16,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {Array.from({ length: columns }).map((_, col) => {
        // Build a per-column slice, then duplicate it for a seamless loop.
        const slice = Array.from({ length: perColumn }).map(
          (__, i) => source[(col * perColumn + i) % source.length],
        );
        const loop = [...slice, ...slice];
        const colHeight = perColumn * rowHeight;
        const dir = col % 2 === 0 ? 1 : -1;
        const offset = ((frame * speed * dir) % colHeight + colHeight) % colHeight;

        return (
          <div key={col} style={{ position: "relative", width: 240 }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                transform: `translateY(${dir === 1 ? -offset : offset - colHeight}px)`,
              }}
            >
              {loop.map((t, i) => (
                <div
                  key={i}
                  style={{
                    height: rowHeight,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontFamily: theme.fontMono,
                    fontSize: 26,
                    color: t.resolved ? theme.teal : theme.textDim,
                  }}
                >
                  {t.resolved ? (
                    <span style={{ color: theme.teal, fontSize: 24 }}>✓</span>
                  ) : (
                    <span style={{ color: theme.line, fontSize: 24 }}>·</span>
                  )}
                  <span>{t.id}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
