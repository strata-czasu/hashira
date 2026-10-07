import {
  type REST,
  type RESTGetAPIApplicationGuildCommandsResult,
  type RESTPostAPIApplicationCommandsJSONBody,
  Routes,
} from "discord.js";

import { commandKey, type CommandOwnership, validateCommandOwnership } from "./commandOwnership";

export async function syncGuildCommands(
  rest: Pick<REST, "get" | "post" | "patch">,
  applicationId: string,
  guildId: string,
  definitions: readonly RESTPostAPIApplicationCommandsJSONBody[],
  ownership?: CommandOwnership,
): Promise<void> {
  validateCommandOwnership(applicationId, guildId, "hashira", definitions, ownership);
  if (definitions.length === 0) return;
  const route = Routes.applicationGuildCommands(applicationId, guildId);
  const current = (await rest.get(route)) as RESTGetAPIApplicationGuildCommandsResult;
  const existing = new Map(
    current.map((command) => [commandKey(command.type, command.name), command]),
  );
  for (const definition of definitions) {
    const command = existing.get(commandKey(definition.type, definition.name));
    const body = {
      ...definition,
      default_member_permissions: definition.default_member_permissions ?? null,
      name_localizations: definition.name_localizations ?? null,
      description_localizations: definition.description_localizations ?? null,
      nsfw: definition.nsfw ?? false,
      ...((definition.type ?? 1) === 1 ? { options: definition.options ?? [] } : {}),
    };
    if (command) {
      const { type: _type, ...patch } = body;
      await rest.patch(Routes.applicationGuildCommand(applicationId, guildId, command.id), {
        body: patch,
      });
    } else {
      await rest.post(route, { body });
    }
  }
}
