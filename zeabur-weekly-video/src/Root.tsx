import React from "react";
import { Composition } from "remotion";
import { WeeklyReport } from "./Video";
import { DURATION, FPS, HEIGHT, WIDTH } from "./theme";
import reportData from "./data/report.json";
import type { Report } from "./types";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="WeeklyReport"
      component={WeeklyReport}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ report: reportData as Report }}
    />
  );
};
