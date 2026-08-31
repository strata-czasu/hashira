# JSX preview rendering

Renders Discord component views to HTML and PNG so before/after comparisons
of a view can be attached to PRs or posted in Discord. The HTML side is
inspired by [discohook's preview components](https://github.com/discohook/discohook/tree/main/packages/site/app/components/preview/),
but produces static server-side HTML instead of React.

## Pipeline

```
view(state) ──► JSXNode
                 │  render() + builder.toJSON()        (existing)
                 ▼
     APIMessageTopLevelComponent[]                     ◄── hand-built payloads work too
                 │  renderPage()                        (pure, deterministic, snapshot-testable)
                 ▼
     self-contained HTML document                      ◄── arbitrary HTML can enter here
                 │  screenshotHtml()                    (headless Chrome)
                 ▼
     PNG Buffer ──► upload / attach / compare
```

Import from `@hashira/jsx/preview`; nothing here is loaded by the main
entrypoint.

## Usage

```tsx
import { viewToHtml, viewToPng, compareViewsToPng } from "@hashira/jsx/preview";

// Pure HTML (no browser needed) - great for snapshot tests:
const html = viewToHtml(<PlayerView state={snapshot} />);

// Single view -> PNG:
const { data } = await viewToPng(<PlayerView state={snapshot} />);

// Before/after in one labeled image:
const cmp = await compareViewsToPng({
  before: <OldView state={snapshot} />,
  after: <NewView state={snapshot} />,
  layout: "side-by-side", // or "stacked"
});

// Arbitrary HTML:
import { screenshotHtml } from "@hashira/jsx/preview";
const png = await screenshotHtml("<h1>anything</h1>");
```

`attachment://` URLs used by `File` / `MediaGallery` / `Thumbnail` are
resolved from the view's own `files` automatically (buffers become data
URIs); the `attachments` option overrides them per filename.

Pages render at Discord's message column width (520px + padding) and the
screenshot viewport resizes to fit the document, so no width options exist.
Documents without intrinsic width (plain HTML fragments) render at 800px.

## Browser setup

Screenshots need Chrome, driven by Bun's built-in `Bun.WebView` (no browser
automation dependency). Resolution order:

1. `executablePath` option
2. `CHROME_PATH` or `BUN_CHROME_PATH` env var
3. `$PATH` (`google-chrome`, `chromium`, ...) and standard install locations
4. Playwright's cache (`~/.cache/ms-playwright`) for `chrome-headless-shell`

Point `CHROME_PATH` at any Chrome/Chromium, or install a managed
chrome-headless-shell:

```sh
bunx @puppeteer/browsers install chrome-headless-shell --path ~/.cache/browsers
# then: export CHROME_PATH=~/.cache/browsers/chrome-headless-shell/.../chrome-headless-shell
```

## CLI

```sh
bun scripts/view-snapshot.ts <module[#export]> [<module2[#export2]>] [options]

# single view
bun scripts/view-snapshot.ts apps/bot/src/economy/shop.tsx#renderShop \
  --state '{"userId": "123"}' --out shop.png

# before/after comparison (e.g. across two worktrees)
bun scripts/view-snapshot.ts ../old/apps/bot/src/.../playerView.tsx#buildBirthday2026InfoView \
  apps/bot/src/events/birthday2026/playerView.tsx#buildBirthday2026InfoView \
  --state-file state.json
```

State is JSON; ISO date strings are revived into `Date` instances.
Output defaults to `snapshots/` (gitignored).

## Notes

- Timestamps render in UTC with a fixed 24-hour cycle and default locale
  `pl-PL` so the same state always produces identical pixels. Override via
  the `markdown` option (`locale`, `timeZone`, `now`).
- Mentions render as pills; pass `markdown.resolveMention` to show real
  names. Custom emoji use the public CDN by default.
- The HTML is an approximation of the Discord client (fonts differ), which
  is fine for visual diffs: consistency between renders matters more than
  pixel-perfect fidelity.
