/**
 * Fetch issues assigned to "can.yu" from the Linear GraphQL API for the most
 * recent Thursday→Wednesday window and write src/data/report.json.
 *
 * Requires the LINEAR_API_KEY environment variable.
 *
 *   LINEAR_API_KEY=lin_api_xxx npm run fetch
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Highlight,
  Incident,
  Report,
  StateBucket,
  TeamGroup,
} from "../src/types";

const ASSIGNEE = "can.yu";
const LINEAR_ENDPOINT = "https://api.linear.app/graphql";
const SUPPORT_TEAM_KEY = "SUP";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(__dirname, "../src/data/report.json");

interface LinearIssue {
  identifier: string;
  title: string;
  updatedAt: string;
  state: { name: string; type: string } | null;
  team: { key: string; name: string } | null;
  assignee: { displayName: string } | null;
}

interface IssuesResponse {
  issues: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: LinearIssue[];
  };
}

/**
 * Compute the most recent Thursday→Wednesday window relative to `now`.
 * The window ends at the end of the most recent Wednesday and starts on the
 * Thursday seven days earlier.
 */
function weekWindow(now: Date): { start: Date; end: Date; label: string } {
  // 0=Sun..3=Wed..4=Thu..6=Sat
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  // Days since the most recent Wednesday (inclusive of today if it's Wed).
  const daysSinceWed = (day - 3 + 7) % 7;
  const end = new Date(d);
  end.setUTCDate(d.getUTCDate() - daysSinceWed);
  end.setUTCHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 6);
  start.setUTCHours(0, 0, 0, 0);

  const fmt = (x: Date) =>
    x.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const label = `${fmt(start)} – ${fmt(end)}, ${end.getUTCFullYear()}`;
  return { start, end, label };
}

const QUERY = `
  query WeeklyIssues($after: String, $filter: IssueFilter!) {
    issues(first: 100, after: $after, filter: $filter) {
      pageInfo { hasNextPage endCursor }
      nodes {
        identifier
        title
        updatedAt
        state { name type }
        team { key name }
        assignee { displayName }
      }
    }
  }
`;

async function linearRequest<T>(apiKey: string, variables: object): Promise<T> {
  const res = await fetch(LINEAR_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: apiKey },
    body: JSON.stringify({ query: QUERY, variables }),
  });
  if (!res.ok) {
    throw new Error(`Linear API HTTP ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(`Linear API error: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) throw new Error("Linear API returned no data");
  return json.data;
}

/** Map a Linear workflow state type to one of our four buckets. */
function bucketOf(stateType: string | undefined): StateBucket {
  switch (stateType) {
    case "completed":
      return "resolved";
    case "started":
      return "inProgress";
    case "triage":
      return "triage";
    default:
      // backlog | unstarted | canceled | unknown
      return "waiting";
  }
}

async function fetchAllIssues(apiKey: string, start: Date, end: Date) {
  // Match the assignee by displayName (per spec) but also fall back to the
  // username `name`, since some workspaces shorten the displayName.
  const filter = {
    assignee: { or: [{ displayName: { eq: ASSIGNEE } }, { name: { eq: ASSIGNEE } }] },
    updatedAt: { gte: start.toISOString(), lte: end.toISOString() },
  };

  const all: LinearIssue[] = [];
  let after: string | null = null;
  // Paginate until Linear says there are no more pages.
  for (;;) {
    const data: IssuesResponse = await linearRequest<IssuesResponse>(apiKey, {
      after,
      filter,
    });
    all.push(...data.issues.nodes);
    if (!data.issues.pageInfo.hasNextPage) break;
    after = data.issues.pageInfo.endCursor;
  }
  return all;
}

function buildReport(issues: LinearIssue[], window: ReturnType<typeof weekWindow>): Report {
  const stats = { resolved: 0, inProgress: 0, triage: 0, waiting: 0, total: 0 };
  const teamMap = new Map<string, TeamGroup>();
  const highlights: Highlight[] = [];
  const incidents: Incident[] = [];
  const tickets: { id: string; resolved: boolean }[] = [];

  for (const issue of issues) {
    const bucket = bucketOf(issue.state?.type);
    const resolved = bucket === "resolved";
    stats[bucket] += 1;
    stats.total += 1;

    const teamKey = issue.team?.key ?? "—";
    const teamName = issue.team?.name ?? "Unknown";
    const group = teamMap.get(teamKey) ?? {
      key: teamKey,
      name: teamName,
      count: 0,
      resolved: 0,
    };
    group.count += 1;
    if (resolved) group.resolved += 1;
    teamMap.set(teamKey, group);

    tickets.push({ id: issue.identifier, resolved });

    if (teamKey === SUPPORT_TEAM_KEY) {
      incidents.push({
        id: issue.identifier,
        title: issue.title,
        state: issue.state?.name ?? "Unknown",
        resolved,
      });
    } else {
      highlights.push({
        id: issue.identifier,
        title: issue.title,
        team: teamKey,
        state: issue.state?.name ?? "Unknown",
        bucket,
        resolved,
      });
    }
  }

  // Surface resolved highlights first, then by identifier for stability.
  highlights.sort((a, b) => Number(b.resolved) - Number(a.resolved) || a.id.localeCompare(b.id));

  return {
    generatedAt: new Date().toISOString(),
    assignee: ASSIGNEE,
    window: { start: window.start.toISOString(), end: window.end.toISOString(), label: window.label },
    stats,
    teams: [...teamMap.values()].sort((a, b) => b.count - a.count),
    highlights,
    incidents,
    tickets,
  };
}

async function main() {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    console.error("ERROR: LINEAR_API_KEY environment variable is not set.");
    process.exit(1);
  }

  const window = weekWindow(new Date());
  console.log(`Fetching issues for "${ASSIGNEE}" in window ${window.label}`);
  console.log(`  ${window.start.toISOString()} → ${window.end.toISOString()}`);

  const issues = await fetchAllIssues(apiKey, window.start, window.end);
  console.log(`Fetched ${issues.length} issue(s).`);

  const report = buildReport(issues, window);
  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(report, null, 2) + "\n");
  console.log(`Wrote ${OUTPUT}`);
  console.log(
    `  resolved=${report.stats.resolved} inProgress=${report.stats.inProgress} ` +
      `triage=${report.stats.triage} waiting=${report.stats.waiting} ` +
      `teams=${report.teams.length} incidents=${report.incidents.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
