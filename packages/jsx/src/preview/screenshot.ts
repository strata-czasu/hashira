/// <reference lib="dom" />

/**
 * HTML -> PNG rendering via headless Chrome, driven by `Bun.WebView`.
 *
 * WebView is built into the Bun runtime (experimental API), so no browser
 * automation dependency is needed. Chrome is located via
 * `options.executablePath`, the CHROME_PATH / BUN_CHROME_PATH environment
 * variables, or Bun's own search ($PATH, standard install locations,
 * Playwright's chrome-headless-shell cache).
 */

export interface ScreenshotOptions {
  /** Viewport width in CSS pixels (default: 600). */
  width?: number;
  /** Device scale factor; 2 gives crisp retina-style output (default: 2). */
  scale?: number;
  /** Max milliseconds to wait for images/fonts before shooting anyway (default: 30_000). */
  timeoutMs?: number;
  /**
   * Path to a Chrome/Chromium executable. Defaults to CHROME_PATH or
   * BUN_CHROME_PATH, then to Bun's own search.
   */
  executablePath?: string;
}

export interface ScreenshotResult {
  /** PNG image data. */
  data: Buffer;
  /** Image width/height in device pixels (css px x scale). */
  width: number;
  height: number;
}

type WebView = InstanceType<typeof Bun.WebView>;

const DEFAULT_WIDTH = 600;
const DEFAULT_SCALE = 2;
const DEFAULT_TIMEOUT_MS = 30_000;

const CHROME_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--force-color-profile=srgb",
  "--hide-scrollbars",
];

function resolveExecutable(executablePath?: string): string | undefined {
  return executablePath ?? process.env.CHROME_PATH ?? process.env.BUN_CHROME_PATH ?? undefined;
}

function spawnView(executablePath?: string): WebView {
  const path = resolveExecutable(executablePath);
  try {
    return new Bun.WebView({
      backend: { type: "chrome", ...(path ? { path } : {}), argv: CHROME_ARGS },
    });
  } catch (cause) {
    throw new Error(
      "Could not spawn a Chrome executable for `Bun.WebView`. Install Chrome/Chromium, " +
        "set CHROME_PATH (or BUN_CHROME_PATH), or pass options.executablePath.",
      { cause },
    );
  }
}

function waitForResources(timeoutMs: number): string {
  return `(async () => {
  await document.fonts.ready;
  const images = [...document.images];
  if (images.length === 0) return null;
  const loaded = images.map((img) =>
    img.complete
      ? null
      : new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        }),
  );
  await Promise.race([
    Promise.all(loaded),
    new Promise((resolve) => setTimeout(resolve, ${timeoutMs})),
  ]);
  return null;
})()`;
}

interface CdpFrameTree {
  frameTree: { frame: { id: string } };
}

export async function screenshotHtml(
  html: string,
  options: ScreenshotOptions = {},
): Promise<ScreenshotResult> {
  const width = options.width ?? DEFAULT_WIDTH;
  const scale = options.scale ?? DEFAULT_SCALE;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // One view per call: views are independent tabs in a single per-process
  // Chrome, so concurrent screenshots never contend for operation slots.
  const view = spawnView(options.executablePath);
  try {
    // The first navigation establishes the CDP session.
    await view.navigate("about:blank");
    const { frameTree } = await view.cdp<CdpFrameTree>("Page.getFrameTree");

    // Lay out at the target size and scale before content is set, so the
    // document renders into its final viewport.
    await view.cdp("Emulation.setDeviceMetricsOverride", {
      width,
      height: 200,
      deviceScaleFactor: scale,
      mobile: false,
    });
    // Inject the document directly instead of navigating: no data-URL size
    // limits and no temporary files.
    await view.cdp("Page.setDocumentContent", { frameId: frameTree.frame.id, html });

    // Wait for web fonts and images, best effort: slow or unreachable
    // external resources should not fail the snapshot.
    await view.evaluate(waitForResources(timeoutMs));

    const contentHeight = await view.evaluate<number>(
      "Math.ceil(document.documentElement.scrollHeight)",
    );
    const height = Math.max(contentHeight, 1);
    await view.cdp("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: scale,
      mobile: false,
    });

    const data = await view.screenshot({ encoding: "buffer" });
    return {
      data,
      width: width * scale,
      height: height * scale,
    };
  } finally {
    view.close();
  }
}

/** Force-kills the shared Chrome subprocess, if one was started. */
export async function closeBrowser(): Promise<void> {
  Bun.WebView.closeAll();
}
