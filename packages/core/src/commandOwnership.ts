import { readFile } from "node:fs/promises";
import * as v from "valibot";

const Snowflake = v.pipe(v.string(), v.regex(/^\d+$/));
const CommandOwner = v.picklist(["hashira", "kasutera"]);
export type CommandOwner = v.InferOutput<typeof CommandOwner>;

export const CommandOwnership = v.object({
  applicationId: Snowflake,
  defaultOwner: v.exactOptional(CommandOwner),
  commands: v.array(
    v.object({
      guildId: Snowflake,
      type: v.picklist([1, 2, 3]),
      name: v.pipe(v.string(), v.regex(/\S/)),
      owner: CommandOwner,
    }),
  ),
});
export type CommandOwnership = v.InferOutput<typeof CommandOwnership>;

export function commandKey(type: number, name: string): string {
  return `${type}:${name}`;
}

export function parseCommandOwnership(value: unknown): CommandOwnership {
  const ownership = v.parse(CommandOwnership, value);
  const seen = new Set<string>();
  for (const { guildId, type, name } of ownership.commands) {
    const key = `${guildId}:${commandKey(type, name)}`;
    if (seen.has(key)) throw new Error("Duplicate command ownership entry");
    seen.add(key);
  }
  return ownership;
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
