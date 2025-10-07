import { Hashira } from "@hashira/core";
import { type GuildMember, inlineCode } from "discord.js";
import { Logger } from "./logger";
import { getLogMessageEmbed } from "./util";

type GuildMemberNicknameUpdateData = {
  member: GuildMember;
  oldNickname: string | null;
  newNickname: string | null;
};

type guildMemberTagUpdateData = {
  member: GuildMember;
  oldTag: string | null;
  newTag: string | null;
};

export const profileLog = new Hashira({ name: "profileLog" }).const(
  "profileLog",
  new Logger()
    .addMessageType(
      "guildMemberNicknameUpdate",
      async (
        { timestamp },
        { member, oldNickname, newNickname }: GuildMemberNicknameUpdateData,
      ) => {
        const embed = getLogMessageEmbed(member, timestamp).setColor("Yellow");

        if (oldNickname === null && newNickname !== null) {
          embed.setDescription(`**Ustawia nick na** ${inlineCode(newNickname)}`);
        } else if (oldNickname !== null && newNickname !== null) {
          embed.setDescription(
            `**Zmienia nick z** ${inlineCode(oldNickname)} **na** ${inlineCode(newNickname)}`,
          );
        } else if (oldNickname !== null && newNickname === null) {
          embed.setDescription(`**Usuwa nick** ${inlineCode(oldNickname)}`);
        } else {
          throw new Error("Nickname update from null to null");
        }

        return embed;
      },
    )
    .addMessageType(
      "guildMemberTagUpdate",
      async ({ timestamp }, { member, oldTag, newTag }: guildMemberTagUpdateData) => {
        const embed = getLogMessageEmbed(member, timestamp).setColor("Yellow");

        if (oldTag === null && newTag !== null) {
          embed.setDescription(`**Ustawia tag na** ${inlineCode(newTag)}`);
        } else if (oldTag !== null && newTag !== null) {
          embed.setDescription(
            `**Zmienia tag z** ${inlineCode(oldTag)} **na** ${inlineCode(newTag)}`,
          );
        } else if (oldTag !== null && newTag === null) {
          embed.setDescription(`**Usuwa tag** ${inlineCode(oldTag)}`);
        } else {
          throw new Error("Tag update from null to null");
        }

        return embed;
      },
    ),
);
