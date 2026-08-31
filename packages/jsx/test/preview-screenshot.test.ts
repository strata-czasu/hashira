/**
 * Browser-based screenshot tests. These are skipped unless a Chrome
 * executable is available, e.g. by setting:
 *
 *   SCREENSHOT_TESTS=1 bun test packages/jsx
 */
import { describe, expect, it } from "bun:test";

import { screenshotHtml } from "../src/preview/screenshot";

const enabled = process.env.SCREENSHOT_TESTS === "1";

describe.skipIf(!enabled)("screenshotHtml", () => {
  it("sizes the png to the rendered content", async () => {
    const result = await screenshotHtml(
      `<!doctype html><html><body style="margin:0;width:200px"><div style="width:200px;height:120px;background:#5865f2"></div></body></html>`,
      { scale: 1 },
    );
    expect(result.width).toBe(200);
    expect(result.height).toBe(120);
    // PNG magic number
    expect([...result.data.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it("renders arbitrary html", async () => {
    const result = await screenshotHtml("<h1>hello</h1>", { scale: 1 });
    expect(result.data.length).toBeGreaterThan(100);
  });
});
