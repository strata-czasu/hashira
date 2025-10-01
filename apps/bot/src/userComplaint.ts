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
import { STRATA_CZASU } from "./specializedConstants";
import { discordTry } from "./util/discordTry";
import { errorFollowUp } from "./util/errorFollowUp";

export const userComplaint = new Hashira({ name: "user-complaint" })
  .use(base)
  .command("donos", (command) =>
    command
      .setDescription("Ciche zgłoszenie do moderacji")
      .setDMPermission(false)
      .handle(async (_ctx, _, itx) => {
        if (!itx.inCachedGuild()) return;

        // Fetch the latest message from the channel
        const lastMessage = await discordTry(
          async () => {
            const messages = await itx.channel?.messages.fetch({ limit: 1 });
            return messages?.first() ?? null;
          },
          [RESTJSONErrorCodes.MissingAccess, RESTJSONErrorCodes.UnknownChannel],
          () => null,
        );

        const actionRows = [
          new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId("target")
              .setLabel("Nick osoby, której dotyczy zgłoszenie")
              .setPlaceholder("np. nazwa użytkownika")
              .setRequired(true)
              .setMinLength(2)
              .setMaxLength(200)
              .setStyle(TextInputStyle.Short),
          ),
          new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId("content")
              .setLabel("W jaki sposób łamane są nasze zasady?")
              .setPlaceholder("Opisz jak złamane zostały zasady")
              .setRequired(true)
              .setMinLength(10)
              .setMaxLength(2000)
              .setStyle(TextInputStyle.Paragraph),
          ),
          new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
            new TextInputBuilder()
              .setCustomId("messageInfo")
              .setLabel("Kanał i godzina zgłaszanej wiadomości")
              .setPlaceholder("Przykład: #rozmowy-1 17:45")
              .setRequired(true)
              .setMinLength(5)
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
        const target = submitAction.components
          .at(0)
          ?.components.find((c) => c.customId === "target")?.value;
        const content = submitAction.components
          .at(1)
          ?.components.find((c) => c.customId === "content")?.value;
        const messageInfo = submitAction.components
          .at(2)
          ?.components.find((c) => c.customId === "messageInfo")?.value;
        if (!content || !target || !messageInfo) {
          return await errorFollowUp(
            submitAction,
            "Nie podano wszystkich wymaganych danych!",
          );
        }

        const channel = await discordTry(
          async () => itx.client.channels.fetch(STRATA_CZASU.COMPLAINT_CHANNEL_ID),
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
              name: "Nick osoby, której dotyczy zgłoszenie",
              value: target,
            },
            {
              name: "Kanał i godzina zgłaszanej wiadomości",
              value: messageInfo,
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

        // Add last message info if available
        if (lastMessage) {
          embed.addFields({
            name: "Ostatnia wiadomość nad komendą /donos (to może NIE BYĆ zgłaszana wiadomość!)",
            value: `[Link](${lastMessage.url})`,
          });
        }
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
