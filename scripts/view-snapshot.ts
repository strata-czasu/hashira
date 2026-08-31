#!/usr/bin/env bun
/**
 * Render a view module to a PNG (or a before/after comparison PNG).
 *
 * A view module is any TS/TSX file exporting a function that takes a state
 * object and returns JSX (a JSXNode). Pass state as inline JSON or via file.
 *
 * Usage:
 *   bun scripts/view-snapshot.ts ./apps/bot/src/economy/shop.tsx#renderShop \
 *     --state '{"userId": "123"}' --out shop.png
 *
 *   bun scripts/view-snapshot.ts old.tsx#view new.tsx#view --state-file s.json
 *   -> writes snapshots/comparison-<label>-<timestamp>.png
 *
 * Options:
 *   --state <json>        State passed to the view function.
 *   --state-file <path>   Read state from a JSON file instead.
 *   --out <path>          Output PNG path (default: snapshots/<name>-<timestamp>.png).
 *   --stacked             Stack before/after vertically instead of side by side.
 *   --scale <n>           Device scale factor (default: 2).
 */

import { basename, resolve } from "node:path";
import { parseArgs } from "node:util";

import {
  closeBrowser,
  compareViewsToPng,
  type ScreenshotResult,
  viewToPng,
} from "@hashira/jsx/preview";

type ViewFunction = (state: unknown) => import("@hashira/jsx").JSXNode;

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    state: { type: "string" },
    "state-file": { type: "string" },
    out: { type: "string" },
    stacked: { type: "boolean" },
    scale: { type: "string" },
  },
  allowPositionals: true,
});

if (positionals.length === 0) {
  console.error("Usage: bun scripts/view-snapshot.ts <module[#export]> [...] [options]");
  process.exit(1);
}

async function loadView(specifier: string): Promise<{ view: ViewFunction; label: string }> {
  const [modulePath, exportName = "default"] = specifier.split("#");
  const resolved = resolve(modulePath);
  if (!(await Bun.file(resolved).exists())) throw new Error(`Module not found: ${resolved}`);

  const exported = (await import(resolved))[exportName];
  if (exported == null) throw new Error(`No view exported as "${exportName}" in ${modulePath}`);

  // Views may export a plain element instead of a function.
  const view = typeof exported === "function" ? exported : () => exported;
  return { view: view as ViewFunction, label: basename(modulePath) };
}

// ISO date strings are revived into Date instances so views can pass them
// straight to discord.js time() helpers.
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/;

async function loadState(): Promise<unknown> {
  const reviver = (_key: string, value: unknown) =>
    typeof value === "string" && ISO_DATE_PATTERN.test(value) ? new Date(value) : value;
  if (values.state) return JSON.parse(values.state, reviver);
  if (values["state-file"]) {
    return JSON.parse(await Bun.file(values["state-file"]).text(), reviver);
  }
  return undefined;
}

const state = await loadState();
const scale = values.scale === undefined ? undefined : Number(values.scale);
const timestamp = new Date().toISOString().replaceAll(":", "-");

try {
  let result: ScreenshotResult;
  let name: string;

  if (positionals.length >= 2) {
    const [before, after] = await Promise.all([loadView(positionals[0]), loadView(positionals[1])]);
    result = await compareViewsToPng({
      before: before.view(state),
      after: after.view(state),
      beforeLabel: before.label,
      afterLabel: after.label,
      stacked: values.stacked,
      scale,
    });
    name = `comparison-${before.label}`;
  } else {
    const { view, label } = await loadView(positionals[0]);
    result = await viewToPng(view(state), { scale });
    name = label;
  }

  const out = values.out ?? `snapshots/${name}-${timestamp}.png`;
  await Bun.write(out, result.data);
  console.log(`Wrote ${out} (${result.width}x${result.height})`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  closeBrowser();
}
