# zeabur-weekly-video

A [Remotion](https://www.remotion.dev/) project that turns one person's Linear
activity into a 28-second weekly recap video.

It pulls every issue assigned to **can.yu** that was updated in the most recent
**Thursday → Wednesday** window, aggregates it into `src/data/report.json`, and
renders a 1920×1080 / 30fps / 840-frame dark-themed video to
`out/weekly-report.mp4`.

## Scenes (840 frames @ 30fps)

| Frames    | Scene             | What it shows |
|-----------|-------------------|---------------|
| 0–120     | **Title**         | Assignee + window, over a scrolling tape of ticket IDs (resolved ones get a teal ✓) |
| 120–300   | **Stats**         | Animated count-up cards: resolved / in-progress / triage / waiting |
| 300–480   | **Team bars**     | Horizontal bar chart grouped by team key, resolved portion in teal |
| 480–660   | **Highlights**    | Notable non-`SUP` issues sliding in |
| 660–750   | **Incident callout** | `SUP` (support) volume — closed vs still-open |
| 750–840   | **Outro**         | Resolved count + close rate, over the ticket tape again |

### Theme

Dark background `#0E1018`, purple `#8B7CF6`, teal `#3DD6A3`, amber `#F5A524`,
all numbers set in a monospace face.

## Data model

`scripts/fetch.ts` queries the Linear GraphQL API and writes `src/data/report.json`:

- **stats** — counts bucketed from Linear workflow state `type`:
  `completed → resolved`, `started → inProgress`, `triage → triage`,
  everything else (`backlog`/`unstarted`/`canceled`) → `waiting`.
- **teams** — grouped by team key (`SUP`, `SEI`, …) with total + resolved counts.
- **highlights** — issues whose team is **not** `SUP`.
- **incidents** — issues whose team **is** `SUP`.
- **tickets** — every issue identifier (+ resolved flag) for the scrolling tape.

The "Thursday → Wednesday" window is computed automatically relative to the
run date (`scripts/fetch.ts → weekWindow`).

## Usage

```bash
npm install

# Pull fresh data from Linear (writes src/data/report.json)
LINEAR_API_KEY=lin_api_xxx npm run fetch

# Type-check
npm run typecheck

# Preview interactively
npm run studio

# Render to out/weekly-report.mp4
npm run render

# fetch + render in one shot
LINEAR_API_KEY=lin_api_xxx npm run build
```

If `LINEAR_API_KEY` is not set, `npm run fetch` exits with an error and the
committed `src/data/report.json` is used as-is for rendering.

### Environment

| Variable         | Required for | Description |
|------------------|--------------|-------------|
| `LINEAR_API_KEY` | `npm run fetch` | A Linear personal API key (`lin_api_…`). |

## Notes

- The fetch filter matches the assignee by `displayName` **or** `name` equal to
  `can.yu`, since Linear workspaces sometimes shorten the display name.
- Rendering uses Remotion's bundled Chrome Headless Shell (downloaded on first
  run); no separate browser install is needed.
