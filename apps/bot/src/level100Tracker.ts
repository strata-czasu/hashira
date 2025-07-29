import { Hashira } from "@hashira/core";
import { RESTJSONErrorCodes } from "discord-api-types/v10";
import { base } from "./base";
import { LEVEL_100_RESTORE_ROLES } from "./specializedConstants";
import { discordTry } from "./util/discordTry";
import { getGuildSetting } from "./util/getGuildSetting";

// TODO: remove this after bug on Bruno is fixed or resolved in other way
export const level100Tracker = new Hashira({ name: "level100Tracker" })
  .use(base)
  .handle("guildMemberUpdate", async (_ctx, oldMember, newMember) => {
    const roleId = getGuildSetting(LEVEL_100_RESTORE_ROLES, newMember.guild.id);
    if (!roleId) return;

    const had = oldMember.roles.cache.has(roleId);
    const has = newMember.roles.cache.has(roleId);

    if (had && !has) {
      await discordTry(
        () => newMember.roles.add(roleId),
        [RESTJSONErrorCodes.UnknownMember],
        () => null,
      );
    }
  });
