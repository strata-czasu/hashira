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
    .handle(async (_, { user, size: rawSize, format: rawExtension }, itx) => {
      await itx.deferReply();

      const size = rawSize as ImageSize | null;
      const extension = rawExtension as ImageExtension | null;
      // TODO)) Add option to get the guild avatar if available
      const url = user.displayAvatarURL({
        size: size ?? 1024,
        ...(extension ? { extension } : {}),
      });
      const embed = new EmbedBuilder().setTitle(`Avatar ${user.tag}`).setImage(url);
      await itx.editReply({ embeds: [embed] });
    }),
);
