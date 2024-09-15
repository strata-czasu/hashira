import { Hashira } from "@hashira/core";
import {
  ALLOWED_EXTENSIONS as ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_SIZES as ALLOWED_IMAGE_SIZES,
  EmbedBuilder,
  type ImageExtension,
  type ImageSize,
} from "discord.js";

export const avatar = new Hashira({ name: "avatar" }).command("avatar", (command) =>
  command
    .setDescription("Wyświetl avatar użytkownika")
    .addUser("user", (user) => user.setDescription("Użytkownik"))
    .addInteger("size", (size) =>
      size
        .setDescription("Rozmiar obrazu")
        .setRequired(false)
        .addChoices(
          ...ALLOWED_IMAGE_SIZES.map((size) => ({
            name: size.toString(),
            value: size,
          })),
        ),
    )
    .addString("format", (format) =>
      format
        .setDescription("Format obrazu")
        .setRequired(false)
        .addChoices(
          ...ALLOWED_IMAGE_EXTENSIONS.map((ext) => ({
            name: ext,
            value: ext,
          })),
        ),
    )
    .addBoolean("guild-avatar", (guildAvatar) =>
      guildAvatar
        .setDescription("Pobierz serwerowy avatar zamiast globalnego")
        .setRequired(false),
    )
    .handle(
      async (
        _,
        { user, size: rawSize, format: rawExtension, "guild-avatar": guildAvatar },
        itx,
      ) => {
        await itx.deferReply();

        const size = (rawSize as ImageSize | null) ?? 1024;
        const extension = rawExtension as ImageExtension | null;

        let avatarUrl: string;
        if (guildAvatar && itx.inCachedGuild()) {
          const member = await itx.guild.members.fetch(user.id);
          avatarUrl = member.displayAvatarURL({
            size,
            ...(extension ? { extension } : {}),
          });
        } else {
          avatarUrl = user.displayAvatarURL({
            size,
            ...(extension ? { extension } : {}),
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(`Avatar ${user.tag}`)
          .setImage(avatarUrl);
        await itx.editReply({ embeds: [embed] });
      },
    ),
);
