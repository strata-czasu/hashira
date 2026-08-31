# JSX preview rendering

Renders Discord component views to HTML and PNG.

## Setup

```sh
bun run install-browser
```

## API

```tsx
import { viewToHtml, viewToPng, compareViewsToPng } from "@hashira/jsx/preview";

const html = viewToHtml(<PlayerView state={snapshot} />); // no browser needed
const { data } = await viewToPng(<PlayerView state={snapshot} />);
const cmp = await compareViewsToPng({
  before: <OldView state={snapshot} />,
  after: <NewView state={snapshot} />,
});
```

## CLI

```sh
# single view
bun scripts/view-snapshot.ts apps/bot/src/economy/shop.tsx#renderShop \
  --state '{"userId": "123"}' --out shop.png

# before/after comparison (e.g. across two worktrees)
bun scripts/view-snapshot.ts ../old/apps/bot/src/events/playerView.tsx#buildView \
  apps/bot/src/events/playerView.tsx#buildView --state-file state.json
```

Options: `--state <json>` / `--state-file <path>`, `--out <path>` (default:
`snapshots/<name>-<timestamp>.png`), `--stacked`, `--scale <n>` (default: 2).
