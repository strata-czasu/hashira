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
 *   -> writes comparison-<timestamp>.png
 *
 * Options:
 *   --state <json>        State passed to the view function.
 *   --state-file <path>   Read state from a JSON file instead.
 *   --out <path>          Output PNG path (default: snapshots/<name>.png).
 *   --theme <dark|light>  Preview theme (default: dark).
 *   --stacked             Stack before/after vertically instead of side by side.
 *   --width <px>          Panel width in CSS pixels (default: 520).
 *   --scale <n>           Device scale factor (default: 2).
 */

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parseArgs } from "node:util";

import { closeBrowser, renderViewComparisonToPng, renderViewToPng } from "@hashira/jsx/preview";

type ViewFunction = (state: unknown) => import("@hashira/jsx").JSXNode;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/;

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    state: { type: "string" },
    "state-file": { type: "string" },
    out: { type: "string" },
    theme: { type: "string", default: "dark" },
    stacked: { type: "boolean", default: false },
    width: { type: "string", default: "520" },
    scale: { type: "string", default: "2" },
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
  if (!existsSync(resolved)) {
    throw new Error(`Module not found: ${resolved}`);
  }

  const mod = await import(resolved);
  let candidate: unknown =
    exportName in mod ? mod[exportName] : (mod.default ?? firstFunction(mod));

  // Support modules that export a plain element rather than a function.
  if (typeof candidate !== "function") {
    const element = candidate;
    candidate = () => element;
  }
  if (typeof candidate !== "function") {
    throw new Error(`Export "${exportName}" of ${modulePath} is not a function or JSX element`);
  }
  return { view: candidate as ViewFunction, label: basename(modulePath) };
}

function firstFunction(mod: Record<string, unknown>): unknown {
  const entry = Object.entries(mod).find(
    ([key, value]) => key !== "default" && typeof value === "function",
  );
  return entry?.[1];
}

function loadState(): unknown {
  // ISO date strings are revived into Date instances so views can pass
  // them straight to discord.js time() helpers.
  const reviver = (_key: string, value: unknown) => {
    if (typeof value === "string" && ISO_DATE_PATTERN.test(value)) {
      return new Date(value);
    }
    return value;
  };
  if (values.state) return JSON.parse(values.state, reviver);
  if (values["state-file"]) {
    return JSON.parse(readFileSync(values["state-file"], "utf8"), reviver);
  }
  return undefined;
}

const state = loadState();

if (!existsSync("snapshots")) mkdirSync("snapshots", { recursive: true });

const timestamp = new Date().toISOString().replaceAll(":", "-");
const sharedOptions = {
  theme: values.theme as "dark" | "light",
  panelWidth: Number(values.width),
  scale: Number(values.scale),
};

try {
  if (positionals.length >= 2) {
    const before = await loadView(positionals[0]);
    const after = await loadView(positionals[1]);

    const result = await renderViewComparisonToPng({
      before: before.view(state),
      after: after.view(state),
      beforeLabel: before.label,
      afterLabel: after.label,
      layout: values.stacked ? "stacked" : "side-by-side",
      ...sharedOptions,
    });

    const out = values.out ?? `snapshots/comparison-${before.label}-${timestamp}.png`;
    await Bun.write(out, result.data);
    console.log(`Wrote ${out} (${result.width}x${result.height})`);
  } else {
    const { view, label } = await loadView(positionals[0]);
    const result = await renderViewToPng(view(state), sharedOptions);

    const out = values.out ?? `snapshots/${label}-${timestamp}.png`;
    await Bun.write(out, result.data);
    console.log(`Wrote ${out} (${result.width}x${result.height})`);
  }
  await closeBrowser();
} catch (error) {
  await closeBrowser();
  console.error(error);
  process.exit(1);
}
