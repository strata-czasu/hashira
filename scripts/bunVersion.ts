#!/usr/bin/env bun

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

type DerivedVersion = {
  base: string;
  tag: string;
  caret: string;
};

type Replacement = {
  description: string;
  pattern: RegExp;
  replacement: (version: DerivedVersion) => string;
};

type Target = {
  relativePath: string;
  replacements: Replacement[];
};

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");

const targets: Target[] = [
  {
    relativePath: ".devcontainer/Dockerfile",
    replacements: [
      {
        description: "development container Bun ARG",
        pattern: /ARG BUN_VERSION=bun-v[^\s]+/g,
        replacement: (version) => `ARG BUN_VERSION=${version.tag}`,
      },
    ],
  },
  {
    relativePath: "Dockerfile",
    replacements: [
      {
        description: "production Bun ARG",
        pattern: /ARG BUN_VERSION=\S+/g,
        replacement: (version) => `ARG BUN_VERSION=${version.base}`,
      },
    ],
  },
  {
    relativePath: ".github/workflows/lint-and-test.yml",
    replacements: [
      {
        description: "workflow Bun env",
        pattern: /BUN_VERSION:\s*[^\s]+/g,
        replacement: (version) => `BUN_VERSION: ${version.base}`,
      },
    ],
  },
  {
    relativePath: "flake.nix",
    replacements: [
      {
        description: "Nix shell Bun package",
        pattern: /bun\."[^"]+"/g,
        replacement: (version) => `bun."${version.base}"`,
      },
    ],
  },
  {
    relativePath: "package.json",
    replacements: [
      {
        description: "@types/bun devDependency",
        pattern: /"@types\/bun":\s*"[^"]+"/g,
        replacement: (version) => `"@types/bun": "${version.caret}"`,
      },
    ],
  },
];

function printUsage(): void {
  console.log("Usage: bun ./scripts/bunVersion.ts <version> [--dry-run]\n");
  console.log("Examples:");
  console.log("  bun ./scripts/bunVersion.ts 1.4.0");
  console.log("  bun ./scripts/bunVersion.ts bun-v1.4.0 --dry-run");
}

function parseCliArgs() {
  const parsed = parseArgs({
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", short: "d" },
      help: { type: "boolean", short: "h" },
    },
  });

  if (parsed.values.help) {
    printUsage();
    process.exit(0);
  }

  const [versionInput] = parsed.positionals;

  if (!versionInput) {
    printUsage();
    process.exit(1);
  }

  return { versionInput, dryRun: Boolean(parsed.values["dry-run"]) };
}

function normalizeVersion(input: string): DerivedVersion {
  const raw = input.startsWith("bun-v") ? input.slice("bun-v".length) : input;
  const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

  if (!semverPattern.test(raw)) {
    throw new Error(
      `Invalid version "${input}". Expected a semantic version like 1.4.0 or bun-v1.4.0.`,
    );
  }

  return {
    base: raw,
    tag: `bun-v${raw}`,
    caret: `^${raw}`,
  };
}

async function applyTarget(
  target: Target,
  version: DerivedVersion,
  dryRun: boolean,
): Promise<boolean> {
  const absolutePath = path.resolve(repoRoot, target.relativePath);
  const before = await Bun.file(absolutePath).text();
  let after = before;

  for (const replacement of target.replacements) {
    const regex = new RegExp(replacement.pattern.source, replacement.pattern.flags);

    if (!regex.test(after)) {
      throw new Error(
        `Could not find ${replacement.description} in ${target.relativePath}`,
      );
    }

    regex.lastIndex = 0;
    after = after.replace(regex, replacement.replacement(version));
  }

  if (after === before) {
    console.log(`[skip] ${target.relativePath} already uses ${version.base}`);
    return false;
  }

  if (dryRun) {
    console.log(`[dry-run] ${target.relativePath} would be updated`);
    return true;
  }

  await Bun.write(absolutePath, after);
  console.log(`[updated] ${target.relativePath}`);
  return true;
}

async function main(): Promise<void> {
  const { versionInput, dryRun } = parseCliArgs();
  const version = normalizeVersion(versionInput);
  console.log(`Updating Bun version to ${version.base}${dryRun ? " (dry run)" : ""}`);

  let changes = 0;
  for (const target of targets) {
    const updated = await applyTarget(target, version, dryRun);
    if (updated) ++changes;
  }

  if (changes === 0) {
    console.log("All targets already use the requested version.");
  } else if (dryRun) {
    console.log(`Dry run complete. ${changes} file(s) would change.`);
  } else {
    console.log(`Done. Updated ${changes} file(s).`);
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
