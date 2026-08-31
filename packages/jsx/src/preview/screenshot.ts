/// <reference lib="dom" />

/**
 * HTML -> PNG rendering via headless Chrome, driven by `Bun.WebView`
 * (experimental, built into Bun — no browser automation dependency).
 *
 * Chrome is located via `options.executablePath`, the CHROME_PATH /
 * BUN_CHROME_PATH environment variables, or Bun's own search. The viewport
 * is resized to fit the rendered document, so width is owned by the
 * document's CSS (documents without intrinsic width render at 800px).
 */

export interface ScreenshotOptions {
  /** Device scale factor; 2 gives crisp retina-style output (default: 2). */
  scale?: number;
  /** Max milliseconds to wait for images/fonts before shooting anyway (default: 30_000). */
  timeoutMs?: number;
  /** Path to a Chrome/Chromium executable. */
  executablePath?: string;
}

export interface ScreenshotResult {
  /** PNG image data. */
  data: Buffer;
  /** Image size in device pixels (css px x scale). */
  width: number;
  height: number;
}

type WebView = InstanceType<typeof Bun.WebView>;

const CHROME_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--force-color-profile=srgb",
  "--hide-scrollbars",
];

function spawnView(executablePath?: string): WebView {
  const path = executablePath ?? process.env.CHROME_PATH ?? process.env.BUN_CHROME_PATH;
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
  const pending = [...document.images]
    .filter((img) => !img.complete)
    .map(
      (img) =>
        new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        }),
    );
  await Promise.race([
    Promise.all(pending),
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
  const { scale = 2, timeoutMs = 30_000 } = options;

  // One view per call: views are independent tabs in a single per-process
  // Chrome, so concurrent screenshots never contend for operation slots.
  const view = spawnView(options.executablePath);
  try {
    // The first navigation establishes the CDP session.
    await view.navigate("about:blank");
    const { frameTree } = await view.cdp<CdpFrameTree>("Page.getFrameTree");

    // The real size is measured from the content below, once resources settle.
    await view.cdp("Emulation.setDeviceMetricsOverride", {
      width: 800,
      height: 64,
      deviceScaleFactor: scale,
      mobile: false,
    });
    // Inject the document directly instead of navigating: no data-URL size
    // limits and no temporary files.
    await view.cdp("Page.setDocumentContent", { frameId: frameTree.frame.id, html });

    // Best effort: slow or unreachable resources should not fail the shot.
    await view.evaluate(waitForResources(timeoutMs));

    const width = Math.max(
      await view.evaluate<number>("Math.ceil(document.body.getBoundingClientRect().width)"),
      1,
    );
    const height = Math.max(
      await view.evaluate<number>("Math.ceil(document.documentElement.scrollHeight)"),
      1,
    );
    await view.cdp("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: scale,
      mobile: false,
    });

    const data = await view.screenshot({ encoding: "buffer" });
    return { data, width: width * scale, height: height * scale };
  } finally {
    view.close();
  }
}

/** Force-kills the shared Chrome subprocess, if one was started. */
export async function closeBrowser(): Promise<void> {
  Bun.WebView.closeAll();
}
