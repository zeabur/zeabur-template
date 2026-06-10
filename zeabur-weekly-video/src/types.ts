export type StateBucket = "resolved" | "inProgress" | "triage" | "waiting";

export interface ReportStats {
  resolved: number;
  inProgress: number;
  triage: number;
  waiting: number;
  total: number;
}

export interface TeamGroup {
  key: string;
  name: string;
  count: number;
  resolved: number;
}

export interface Highlight {
  id: string;
  title: string;
  team: string;
  state: string;
  bucket: StateBucket;
  resolved: boolean;
}

export interface Incident {
  id: string;
  title: string;
  state: string;
  resolved: boolean;
}

export interface WeekWindow {
  start: string; // ISO
  end: string; // ISO
  label: string; // e.g. "Jun 4 – Jun 10, 2026"
}

export interface Report {
  generatedAt: string;
  assignee: string;
  window: WeekWindow;
  stats: ReportStats;
  teams: TeamGroup[];
  highlights: Highlight[];
  incidents: Incident[];
  /** Every ticket identifier in the window, used for the scrolling tape. */
  tickets: { id: string; resolved: boolean }[];
}
