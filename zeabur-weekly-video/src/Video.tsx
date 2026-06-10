import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { scenes, theme } from "./theme";
import type { Report } from "./types";
import { TitleScene } from "./scenes/Title";
import { StatsScene } from "./scenes/Stats";
import { TeamBarsScene } from "./scenes/TeamBars";
import { HighlightsScene } from "./scenes/Highlights";
import { IncidentScene } from "./scenes/IncidentCallout";
import { OutroScene } from "./scenes/Outro";

export const WeeklyReport: React.FC<{ report: Report }> = ({ report }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg, fontFamily: theme.fontSans }}>
      <Sequence from={scenes.title.from} durationInFrames={scenes.title.durationInFrames}>
        <TitleScene report={report} />
      </Sequence>
      <Sequence from={scenes.stats.from} durationInFrames={scenes.stats.durationInFrames}>
        <StatsScene report={report} />
      </Sequence>
      <Sequence from={scenes.teams.from} durationInFrames={scenes.teams.durationInFrames}>
        <TeamBarsScene report={report} />
      </Sequence>
      <Sequence
        from={scenes.highlights.from}
        durationInFrames={scenes.highlights.durationInFrames}
      >
        <HighlightsScene report={report} />
      </Sequence>
      <Sequence
        from={scenes.incident.from}
        durationInFrames={scenes.incident.durationInFrames}
      >
        <IncidentScene report={report} />
      </Sequence>
      <Sequence from={scenes.outro.from} durationInFrames={scenes.outro.durationInFrames}>
        <OutroScene report={report} />
      </Sequence>
    </AbsoluteFill>
  );
};
