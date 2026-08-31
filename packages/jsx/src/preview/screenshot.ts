import { homedir } from "node:os";
import { join } from "node:path";

export interface ScreenshotOptions {
  scale?: number;
}

export interface ScreenshotResult {
  data: Buffer;
  width: number;
  height: number;
}

const CHROME_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--force-color-profile=srgb",
  "--hide-scrollbars",
];

function browsersDir(): string {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) return process.env.PLAYWRIGHT_BROWSERS_PATH;
  const home = homedir();
  if (process.platform === "darwin") return join(home, "Library", "Caches", "ms-playwright");
  if (process.platform === "win32") {
    return join(process.env.LOCALAPPDATA ?? join(home, "AppData", "Local"), "ms-playwright");
  }
  return join(home, ".cache", "ms-playwright");
}

function findHeadlessShell(): string {
  const binary =
    process.platform === "win32" ? "chrome-headless-shell.exe" : "chrome-headless-shell";
  const glob = new Bun.Glob(`chromium_headless_shell-*/chrome-headless-shell-*/${binary}`);
  const revision = (path: string) => Number(/chromium_headless_shell-(\d+)/.exec(path)?.[1] ?? 0);
  const matches = [...glob.scanSync({ cwd: browsersDir(), absolute: true })];
  const path = matches.sort((a, b) => revision(a) - revision(b)).pop();
  if (!path) {
    throw new Error("chromium-headless-shell not found; run `bun run install-browser`.");
  }
  return path;
}

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
  const view = new Bun.WebView({
    backend: { type: "chrome", path: findHeadlessShell(), argv: CHROME_ARGS },
  });
  try {
    await view.navigate("about:blank");
    const { frameTree } = await view.cdp<CdpFrameTree>("Page.getFrameTree");
    await view.cdp("Emulation.setDeviceMetricsOverride", {
      width: 800,
      height: 64,
      deviceScaleFactor: scale,
      mobile: false,
    });
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

export function closeBrowser(): void {
  Bun.WebView.closeAll();
}
