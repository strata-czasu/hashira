import { Hashira } from "@hashira/core";
import {
  ActionRowBuilder,
  EmbedBuilder,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  RESTJSONErrorCodes,
  TextInputBuilder,
  TextInputStyle,
  channelMention,
} from "discord.js";
import { base } from "./base";
import { discordTry } from "./util/discordTry";
import { errorFollowUp } from "./util/errorFollowUp";

const COMPLAINT_CHANNEL_ID = "1285336622380093492" as const;

export const userComplaint = new Hashira({ name: "anonymous-complaint" })
  .use(base)
  .command("donos", (command) =>
    command
      .setDescription("Ciche zgłoszenie do moderacji")
      .setDMPermission(false)
      .handle(async (_ctx, _, itx) => {
        if (!itx.inCachedGuild()) return;

        const input =
          new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId("content")
              .setLabel("Treść")
              .setPlaceholder("Opisz swój problem")
              .setRequired(true)
              .setMinLength(10)
              .setMaxLength(2000)
              .setStyle(TextInputStyle.Paragraph),
          );
        const modal = new ModalBuilder()
          .setCustomId(`complaint-${itx.user.id}`)
          .setTitle("Zgłoś problem")
          .addComponents(input);
        await itx.showModal(modal);

        const submitAction = await itx.awaitModalSubmit({ time: 60_000 * 15 });
        await submitAction.deferReply({ ephemeral: true });

        // TODO)) Abstract this into a helper/common util
        const content = submitAction.components
          .at(0)
          ?.components.find((c) => c.customId === "content")?.value;
        if (!content) {
          return await errorFollowUp(submitAction, "Nie podano treści zgłoszenia!");
        }

        const channel = await discordTry(
          async () => itx.client.channels.fetch(COMPLAINT_CHANNEL_ID),
          [RESTJSONErrorCodes.UnknownChannel, RESTJSONErrorCodes.MissingAccess],
          () => null,
        );
        if (!channel || !channel.isTextBased()) {
          return await errorFollowUp(
            submitAction,
            "Nie udało się wysłać zgłoszenia! Odezwij się bezpośrednio do kogoś z moderacji.",
          );
        }

        const embed = new EmbedBuilder()
          .setTitle(`Zgłoszenie od ${itx.user.tag}`)
          .setDescription(content)
          .addFields({
            name: "Kanał zgłoszenia",
            value: `${channelMention(itx.channelId)} (${itx.channelId})`,
          })
          .setFooter({
            text: `ID: ${itx.user.id}`,
            iconURL: itx.user.displayAvatarURL(),
          })
          .setTimestamp(submitAction.createdAt);
        const success = await discordTry(
          async () => {
            channel.send({
              content: "@everyone",
              embeds: [embed],
              allowedMentions: {
                parse: ["everyone"],
              },
            });
            return true;
          },
          [RESTJSONErrorCodes.MissingAccess],
          () => false,
        );
        if (!success) {
          return await errorFollowUp(
            submitAction,
            "Nie udało się wysłać zgłoszenia! Odezwij się bezpośrednio do kogoś z moderacji.",
          );
        }

        await submitAction.editReply("Zgłoszenie zostało wysłane!");
      }),
  );