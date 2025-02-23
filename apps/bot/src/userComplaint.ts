import { Hashira } from "@hashira/core";
import {
  ActionRowBuilder,
  DiscordjsErrorCodes,
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

export const userComplaint = new Hashira({ name: "user-complaint" })
  .use(base)
  .command("donos", (command) =>
    command
      .setDescription("Ciche zgłoszenie do moderacji")
      .setDMPermission(false)
      .handle(async (_ctx, _, itx) => {
        if (!itx.inCachedGuild()) return;

        const actionRows = [
          new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId("content")
              .setLabel("Treść")
              .setPlaceholder("Opisz swój problem")
              .setRequired(true)
              .setMinLength(10)
              .setMaxLength(2000)
              .setStyle(TextInputStyle.Paragraph),
          ),
          new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId("target")
              .setLabel("Kogo lub czego dotyczy zgłoszenie?")
              .setPlaceholder("np. użytkownik, wiadomość lub inny istotny kontekst")
              .setRequired(true)
              .setMinLength(3)
              .setMaxLength(200)
              .setStyle(TextInputStyle.Short),
          ),
        ];

        const customId = `donos:${itx.user.id}`;
        const modal = new ModalBuilder()
          .setCustomId(customId)
          .setTitle("Zgłoś problem")
          .addComponents(actionRows);
        await itx.showModal(modal);

        const submitAction = await discordTry(
          () =>
            itx.awaitModalSubmit({
              time: 60_000 * 15,
              filter: (modal) => modal.customId === customId,
            }),
          [DiscordjsErrorCodes.InteractionCollectorError],
          () => null,
        );
        if (!submitAction) return;

        await submitAction.deferReply({ flags: "Ephemeral" });

        // TODO)) Abstract this into a helper/common util
        const content = submitAction.components
          .at(0)
          ?.components.find((c) => c.customId === "content")?.value;
        const target = submitAction.components
          .at(1)
          ?.components.find((c) => c.customId === "target")?.value;
        if (!content || !target) {
          return await errorFollowUp(
            submitAction,
            "Nie podano wszystkich wymaganych danych!",
          );
        }

        const channel = await discordTry(
          async () => itx.client.channels.fetch(COMPLAINT_CHANNEL_ID),
          [RESTJSONErrorCodes.UnknownChannel, RESTJSONErrorCodes.MissingAccess],
          () => null,
        );
        if (!channel || !channel.isSendable()) {
          return await errorFollowUp(
            submitAction,
            "Nie udało się wysłać zgłoszenia! Odezwij się bezpośrednio do kogoś z moderacji.",
          );
        }

        const embed = new EmbedBuilder()
          .setTitle(`Zgłoszenie od ${itx.user.tag}`)
          .setDescription(content)
          .addFields(
            {
              name: "Kogo lub czego dotyczy zgłoszenie?",
              value: target,
            },
            {
              name: "Kanał zgłoszenia",
              value: `${channelMention(itx.channelId)} (${itx.channelId})`,
            },
          )
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
