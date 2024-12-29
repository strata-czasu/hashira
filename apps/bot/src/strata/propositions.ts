import {
  EmbedBuilder,
  type RGBTuple,
  channelMention,
  escapeMarkdown,
} from "@discordjs/builders";
import { Hashira } from "@hashira/core";
import {
  ActionRowBuilder,
  ChannelType,
  type Message,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  type ModalSubmitInteraction,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { base } from "../base";
import { errorFollowUp } from "../util/errorFollowUp";
import {
  type GuildSettingsMeta,
  type GuildSettingsMetaUpdates,
  getGuildSettingsMeta,
  updateGuildSettingsMeta,
} from "../util/guildSettingsMeta";

const isEmojiValid = async (emoji: string, message: Message<true>) => {
  try {
    await message.react(emoji);
    return true;
  } catch {
    return false;
  }
};

const propositionRows = [
  new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
    new TextInputBuilder()
      .setCustomId("proposition-content")
      .setLabel("Treść propozycji")
      .setRequired(true)
      .setPlaceholder("# Regulamin jest zły i szyny były złe.")
      .setStyle(TextInputStyle.Paragraph),
  ),
];

const complaintRows = [
  new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
    new TextInputBuilder()
      .setCustomId("complaint-content")
      .setLabel("Treść skargi")
      .setRequired(true)
      .setPlaceholder("# XYZ powiedział mi, że jestem głupi.")
      .setStyle(TextInputStyle.Paragraph),
  ),
];

const questionRows = [
  new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(
    new TextInputBuilder()
      .setCustomId("question-content")
      .setLabel("Treść pytania")
      .setRequired(true)
      .setPlaceholder("# Czy za XYZ są kary?")
      .setStyle(TextInputStyle.Paragraph),
  ),
];

type FormType = "proposition" | "complaint" | "question";

const getContent = (itx: ModalSubmitInteraction<"cached">, type: FormType) => {
  const fieldMap = {
    proposition: "proposition-content",
    complaint: "complaint-content",
    question: "question-content",
  };

  return itx.fields.getTextInputValue(fieldMap[type]);
};

const getChannelId = (type: FormType, meta: GuildSettingsMeta) => {
  const channelsMap = {
    proposition: meta.propositionsChannelId,
    complaint: meta.complaintsChannelId,
    question: meta.questionsChannelId,
  };

  return channelsMap[type];
};

const getColors = (type: FormType) => {
  const colorsMap = {
    // #00C015
    proposition: [0, 192, 21],
    // #FF3B3C
    complaint: [255, 59, 60],
    // #000000
    question: [0, 0, 0],
  } satisfies Record<FormType, RGBTuple>;

  return colorsMap[type];
};

export const propositions = new Hashira({ name: "propositions" })
  .use(base)
  .command("propozycja", (cmd) =>
    cmd.setDescription("Wyślij swoją propozycję").handle(async (_, __, itx) => {
      const customId = `proposition-${itx.user.id}`;
      const propositionModal = new ModalBuilder()
        .setTitle("Propozycja")
        .setCustomId(customId)
        .addComponents(propositionRows);

      await itx.showModal(propositionModal);
    }),
  )
  .command("skarga", (cmd) =>
    cmd.setDescription("Wyślij swoją skargę").handle(async (_, __, itx) => {
      const customId = `complaint-${itx.user.id}`;
      const propositionModal = new ModalBuilder()
        .setTitle("Skarga")
        .setCustomId(customId)
        .addComponents(complaintRows);

      await itx.showModal(propositionModal);
    }),
  )
  .command("pytanie", (cmd) =>
    cmd.setDescription("Zadaj pytanie").handle(async (_, __, itx) => {
      const customId = `question-${itx.user.id}`;
      const propositionModal = new ModalBuilder()
        .setTitle("Pytanie")
        .setCustomId(customId)
        .addComponents(questionRows);

      await itx.showModal(propositionModal);
    }),
  )
  .group("propo-skargi", (group) =>
    group
      .setDescription("Zarządzaj propozycjami i skargami")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addCommand("ustaw", (cmd) =>
        cmd
          .setDescription("Ustaw kanały do propozycji, skarg i pytań")
          .addString("type", (input) =>
            input
              .addChoices(
                { name: "Propozycje", value: "propositions" },
                { name: "Skargi", value: "complaints" },
                { name: "Pytania", value: "questions" },
              )
              .setDescription("Wybierz typ kanału"),
          )
          .addChannel("channel", (input) =>
            input
              .setDescription("Kanał do propozycji i skarg")
              .setChannelType(ChannelType.GuildText),
          )
          .handle(async ({ prisma }, { type, channel }, itx) => {
            if (!itx.inCachedGuild()) return;

            const change: GuildSettingsMetaUpdates = {};
            if (type === "propositions") change.propositionsChannelId = channel.id;
            else if (type === "complaints") change.complaintsChannelId = channel.id;
            else if (type === "questions") change.questionsChannelId = channel.id;
            else return errorFollowUp(itx, "Nieprawidłowy typ kanału");

            await prisma.$transaction((tx) =>
              updateGuildSettingsMeta(tx, itx.guildId, change),
            );

            const chanenlType =
              type === "propositions"
                ? "propozycji"
                : type === "complaints"
                  ? "skarg"
                  : "pytań";

            await itx.reply(
              `Kanał do ${chanenlType} ustawiony na ${channelMention(channel.id)}`,
            );
          }),
      )
      .addCommand("emojis", (cmd) =>
        cmd
          .setDescription("Ustaw emoji, którę będą używane pod propozycjami")
          .addString("text", (input) =>
            input.setDescription(
              "Wprowadź emoji po kolei, oddzielone przecinkami, np. 👍,👎",
            ),
          )
          .handle(async ({ prisma }, { text }, itx) => {
            if (!itx.inCachedGuild()) return;

            const emojis = text.split(",").map((emoji) => emoji.trim());

            if (emojis.length === 0)
              return errorFollowUp(itx, "Nie podano żadnych emoji");
            if (emojis.length >= 10) return errorFollowUp(itx, "Podano za dużo emoji");
            const message = await itx.channel?.send("Checking if emojis are valid...");
            if (!message)
              return errorFollowUp(
                itx,
                "Couldn't send message to check emoji validity",
              );

            for (const emoji of emojis) {
              if (!(await isEmojiValid(emoji, message))) {
                return errorFollowUp(
                  itx,
                  `Emoji ${escapeMarkdown(emoji)} jest nieprawidłowe. Spróbuj ponownie.`,
                );
              }
            }

            const changes: GuildSettingsMetaUpdates = { propositionsEmojis: emojis };

            await prisma.$transaction((tx) =>
              updateGuildSettingsMeta(tx, itx.guildId, changes),
            );

            await itx.reply(`Emoji propozycji ustawione na ${emojis.join(", ")}`);
          }),
      )
      .addCommand("settings", (cmd) =>
        cmd
          .setDescription("Wyświetl ustawienia propozycji i skarg")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;

            const meta = await getGuildSettingsMeta(prisma, itx.guildId);
            const unset = [];
            if (!meta.propositionsChannelId) unset.push("Kanał do propozycji");
            if (!meta.complaintsChannelId) unset.push("Kanał do skarg");
            if (!meta.questionsChannelId) unset.push("Kanał do pytań");
            if (!meta.propositionsEmojis) unset.push("Emoji propozycji");

            if (unset.length) {
              return errorFollowUp(
                itx,
                `Następujące ustawienia nie zostały ustawione: ${unset.join(", ")}`,
              );
            }

            if (
              !meta.propositionsChannelId ||
              !meta.complaintsChannelId ||
              !meta.questionsChannelId ||
              !meta.propositionsEmojis
            ) {
              return errorFollowUp(
                itx,
                "To nie powinno się zdarzyć, ale coś poszło nie tak",
              );
            }
            await itx.reply(
              [
                "Ustawienia propozycji i skarg:",
                `Kanał do propozycji: ${channelMention(meta.propositionsChannelId)}`,
                `Kanał do skarg: ${channelMention(meta.complaintsChannelId)}`,
                `Kanał do pytań: ${channelMention(meta.questionsChannelId)}`,
                `Emoji propozycji: ${meta.propositionsEmojis.join(", ")}`,
              ].join("\n"),
            );
          }),
      ),
  )
  .handle("interactionCreate", async ({ prisma }, itx) => {
    if (!itx.inCachedGuild()) return;
    if (!itx.isModalSubmit()) return;

    const [type, userId] = itx.customId.split("-");
    if (!type || !userId) return;
    if (userId !== itx.user.id) return;
    if (type !== "proposition" && type !== "complaint" && type !== "question") return;

    await itx.deferReply();

    const content = getContent(itx, type);
    if (!content) return errorFollowUp(itx, "Nie podano treści formularza");

    const meta = await getGuildSettingsMeta(prisma, itx.guildId);

    const channelId = getChannelId(type, meta);
    if (!channelId) return errorFollowUp(itx, "Kanał do zgłoszeń nie został ustawiony");

    if (!meta.propositionsEmojis) {
      return errorFollowUp(itx, "Emoji propozycji nie zostały ustawione");
    }

    const webhook = await itx.guild.channels.createWebhook({
      channel: channelId,
      name: itx.user.username,
      avatar: itx.user.displayAvatarURL(),
      reason: "Utworzenie webhooka do propozycji/skarg/pytań",
    });

    const message = await webhook.send({
      embeds: [
        new EmbedBuilder()
          .setDescription(content)
          .setColor(getColors(type))
          .setFooter({ text: itx.user.id, iconURL: itx.user.displayAvatarURL() }),
      ],
    });

    await Promise.all([
      ...meta.propositionsEmojis.map((emoji) => message.react(emoji)),
      message.startThread({ name: "Dyskusja" }),
      itx.editReply(`Zgłoszenie zostało wysłane na ${channelMention(channelId)}`),
      webhook.delete("Usunięcie webhooka"),
    ]);
  });
