import type { KnipConfig } from "knip";

export default {
  workspaces: {
    "apps/bot": {
      entry: ["src/index.ts", "reload-commands.ts", "seed.ts"],
      project: "**/*.ts",
    },
    "packages/*": {
      entry: "index.ts",
      project: "**/*.ts",
    },
    "tooling/*": {
      entry: "index.ts",
      project: "**/*.ts",
    },
  },
} satisfies KnipConfig;
