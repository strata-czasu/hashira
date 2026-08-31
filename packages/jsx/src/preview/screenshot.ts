/**
 * HTML -> PNG rendering via headless Chrome, driven by `Bun.WebView`
 * (experimental, built into Bun — no browser automation dependency).
 *
 * Chrome is located via the CHROME_PATH environment variable or Bun's own
 * search. The viewport is resized to fit the rendered document, so width is
 * owned by the document's CSS (documents without intrinsic width render at
 * 800px).
 */

export interface ScreenshotOptions {
  /** Device scale factor; 2 gives crisp retina-style output (default: 2). */
  scale?: number;
}

export interface ScreenshotResult {
  /** PNG image data. */
  data: Buffer;
  /** Image size in device pixels (css px x scale). */
  width: number;
  height: number;
}

const CHROME_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--force-color-profile=srgb",
  "--hide-scrollbars",
];

function spawnView(): InstanceType<typeof Bun.WebView> {
  const path = process.env.CHROME_PATH;
  try {
    return new Bun.WebView({
      backend: { type: "chrome", ...(path ? { path } : {}), argv: CHROME_ARGS },
    });
  } catch (cause) {
    throw new Error(
      "Could not spawn a Chrome executable for `Bun.WebView`. " +
        "Install Chrome/Chromium or set CHROME_PATH.",
      { cause },
    );
  }
}

// Best effort: slow or unreachable resources should not fail the shot.
const WAIT_FOR_RESOURCES = `(async () => {
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
    new Promise((resolve) => setTimeout(resolve, 30000)),
  ]);
  return null;
})()`;

const MEASURE_DOCUMENT = `[
  Math.max(Math.ceil(document.body.getBoundingClientRect().width), 1),
  Math.max(Math.ceil(document.documentElement.scrollHeight), 1),
]`;

interface CdpFrameTree {
  frameTree: { frame: { id: string } };
}

export async function screenshotHtml(
  html: string,
  options: ScreenshotOptions = {},
): Promise<ScreenshotResult> {
  const { scale = 2 } = options;

  // One view per call: views are independent tabs in a single per-process
  // Chrome, so concurrent screenshots never contend for operation slots.
  const view = spawnView();
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

    await view.evaluate(WAIT_FOR_RESOURCES);

    const [width, height] = await view.evaluate<[number, number]>(MEASURE_DOCUMENT);
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
export function closeBrowser(): void {
  Bun.WebView.closeAll();
}
