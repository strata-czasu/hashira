import { readFile } from "node:fs/promises";

export type CommandOwner = "hashira" | "kasutera";

export interface CommandOwnership {
  readonly applicationId: string;
  readonly defaultOwner?: CommandOwner;
  readonly commands: readonly {
    readonly guildId: string;
    readonly type: 1 | 2 | 3;
    readonly name: string;
    readonly owner: CommandOwner;
  }[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOwner(value: unknown): value is CommandOwner {
  return value === "hashira" || value === "kasutera";
}

function isId(value: unknown): value is string {
  return typeof value === "string" && /^\d+$/.test(value);
}

export function commandKey(type: number | null | undefined, name: string): string {
  return JSON.stringify([type ?? 1, name]);
}

export function parseCommandOwnership(value: unknown): CommandOwnership {
  if (
    !isRecord(value) ||
    !isId(value["applicationId"]) ||
    (value["defaultOwner"] !== undefined && !isOwner(value["defaultOwner"])) ||
    !Array.isArray(value["commands"])
  ) {
    throw new Error("Invalid command ownership file");
  }

  const commands: CommandOwnership["commands"][number][] = [];
  const seen = new Set<string>();
  for (const entry of value["commands"]) {
    if (
      !isRecord(entry) ||
      !isId(entry["guildId"]) ||
      (entry["type"] !== 1 && entry["type"] !== 2 && entry["type"] !== 3) ||
      typeof entry["name"] !== "string" ||
      !entry["name"].trim() ||
      !isOwner(entry["owner"])
    ) {
      throw new Error("Invalid command ownership entry");
    }
    const key = JSON.stringify([entry["guildId"], entry["type"], entry["name"]]);
    if (seen.has(key)) throw new Error("Duplicate command ownership entry");
    seen.add(key);
    commands.push({
      guildId: entry["guildId"],
      type: entry["type"],
      name: entry["name"],
      owner: entry["owner"],
    });
  }

  return {
    applicationId: value["applicationId"],
    ...(value["defaultOwner"] === undefined ? {} : { defaultOwner: value["defaultOwner"] }),
    commands,
  };
}

export async function loadCommandOwnership(path?: string): Promise<CommandOwnership | undefined> {
  if (!path) return undefined;
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  return parseCommandOwnership(value);
}

/** Validate the complete local set before any command mutations. */
export function validateCommandOwnership(
  applicationId: string,
  guildId: string,
  owner: CommandOwner,
  definitions: readonly { readonly type?: number | null | undefined; readonly name: string }[],
  ownership?: CommandOwnership,
): void {
  if (ownership && ownership.applicationId !== applicationId) {
    throw new Error("Command ownership file belongs to another Discord application");
  }

  const seen = new Set<string>();
  for (const definition of definitions) {
    const type = definition.type ?? 1;
    const key = commandKey(type, definition.name);
    if (seen.has(key)) throw new Error(`Duplicate local command ${type}:${definition.name}`);
    seen.add(key);
    if (!ownership) continue;
    const assigned =
      ownership.commands.find(
        (entry) =>
          entry.guildId === guildId && entry.type === type && entry.name === definition.name,
      )?.owner ?? ownership.defaultOwner;
    if (assigned !== owner) {
      throw new Error(
        `Command ${guildId}/${type}:${definition.name} belongs to ${assigned ?? "no runtime"}, not ${owner}`,
      );
    }
  }
}
