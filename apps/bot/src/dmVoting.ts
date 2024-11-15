import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type DmPoll, type DmPollOption } from "@hashira/db";
import { PaginatorOrder } from "@hashira/paginate";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  TextInputBuilder,
  TextInputStyle,
  TimestampStyles,
  bold,
  italic,
  messageLink,
  time,
  userMention,
} from "discord.js";
import { base } from "./base";
import { discordTry } from "./util/discordTry";
import { ensureUsersExist } from "./util/ensureUsersExist";
import { errorFollowUp } from "./util/errorFollowUp";
import { fetchMembers } from "./util/fetchMembers";
import { hastebin } from "./util/hastebin";
import { numberToEmoji } from "./util/numberToEmoji";

type DMPollWithOptions = DmPoll & { options: DmPollOption[] };

const getPollCreateOrUpdateActionRows = (poll: DMPollWithOptions | null = null) => {
  const titleInput = new TextInputBuilder()
    .setCustomId("title")
    .setLabel("Nazwa (dla administracji)")
    .setPlaceholder("Głosowanie na Użytkownika Miesiąca")
    .setRequired(true)
    .setMinLength(2)
    .setMaxLength(50)
    .setStyle(TextInputStyle.Short);

  const contentInput = new TextInputBuilder()
    .setCustomId("content")
    .setLabel("Treść (dla użytkownika)")
    .setPlaceholder("Kto powinien zostać Użytkownikiem Miesiąca?")
    .setRequired(true)
    .setMinLength(10)
    .setMaxLength(1024)
    .setStyle(TextInputStyle.Paragraph);

  const firstRowInput = new TextInputBuilder()
    .setCustomId("row1")
    .setLabel("Pierwszy rząd")
    .setPlaceholder("Użytkownik 1\nUżytkownik 2\nUżytkownik 3")
    .setRequired(true)
    .setMinLength(2)
    .setMaxLength(256)
    .setStyle(TextInputStyle.Paragraph);

  const secondRowInput = new TextInputBuilder()
    .setCustomId("row2")
    .setLabel("Drugi rząd")
    .setPlaceholder("Pusty głos\nWycofaj z przyszłych głosowań")
    .setRequired(false)
    .setMinLength(2)
    .setMaxLength(256)
    .setStyle(TextInputStyle.Paragraph);

  if (poll) {
    titleInput.setValue(poll.title);
    contentInput.setValue(poll.content);
    const firstRowOptions = poll.options
      .filter((it) => it.row === 0)
      .map(({ option }) => option);
    const secondRowOptions = poll.options
      .filter((it) => it.row === 1)
      .map(({ option }) => option);
    firstRowInput.setValue(firstRowOptions.join("\n"));
    secondRowInput.setValue(secondRowOptions.join("\n"));
  }

  const inputs = [titleInput, contentInput, firstRowInput, secondRowInput];
  return inputs.map((input) =>
    new ActionRowBuilder<ModalActionRowComponentBuilder>().setComponents(input),
  );
};

const getDmPollStatus = (poll: DmPoll) => {
  if (poll.startedAt && poll.finishedAt) {
    return "zakończone";
  }
  if (poll.startedAt && !poll.finishedAt) {
    return "w trakcie";
  }
  if (!poll.startedAt && !poll.finishedAt) {
    return "nie rozpoczęte";
  }
  return "błędny status";
};

export const dmVoting = new Hashira({ name: "dmVoting" })
  .use(base)
  .group("glosowanie-dm", (group) =>
    group
      .setDescription("Głosowania w wiadomościach prywatnych")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addCommand("utworz", (command) =>
        command
          .setDescription("Utwórz nowe głosowanie")
          .handle(async ({ prisma }, _params, itx) => {
            if (!itx.inCachedGuild()) return;

            const modal = new ModalBuilder()
              .setCustomId(`new-poll-${itx.user.id}`)
              .setTitle("Nowe głosowanie")
              .addComponents(...getPollCreateOrUpdateActionRows());
            await itx.showModal(modal);

            const submitAction = await itx.awaitModalSubmit({ time: 60_000 * 10 });
            await submitAction.deferReply();

            // TODO)) Abstract this into a helper/common util
            const title = submitAction.components
              .at(0)
              ?.components.find((c) => c.customId === "title")?.value;
            const content = submitAction.components
              .at(1)
              ?.components.find((c) => c.customId === "content")?.value;
            const rawFirstRowOptions = submitAction.components
              .at(2)
              ?.components.find((c) => c.customId === "row1")?.value;
            const rawSecondRowOptions = submitAction.components
              .at(3)
              ?.components.find((c) => c.customId === "row2")?.value;

            if (!title || !content || !rawFirstRowOptions) {
              return await errorFollowUp(
                submitAction,
                "Nie podano wszystkich wymaganych danych!",
              );
            }

            const firstRowOptions = rawFirstRowOptions
              .split("\n")
              .map((option) => option.trim());

            if (firstRowOptions.length > 5) {
              return await errorFollowUp(
                submitAction,
                "Podano za dużo opcji w pierwszym rzędzie. Maksymalna liczba opcji to 5.",
              );
            }

            const secondRowOptions = rawSecondRowOptions
              ? rawSecondRowOptions.split("\n").map((option) => option.trim())
              : [];

            if (secondRowOptions.length > 5) {
              return await errorFollowUp(
                submitAction,
                "Podano za dużo opcji w drugim rzędzie. Maksymalna liczba opcji to 5.",
              );
            }

            const options = [
              ...firstRowOptions.map((option) => ({ option, row: 0 })),
              ...secondRowOptions.map((option) => ({ option, row: 1 })),
            ];

            const poll = await prisma.dmPoll.create({
              data: {
                createdById: itx.user.id,
                title,
                content,
                options: {
                  createMany: {
                    data: options,
                  },
                },
              },
            });

            await submitAction.editReply(
              `Utworzono głosowanie ${italic(poll.title)} [${poll.id}] z ${bold(options.length.toString())} opcjami.`,
            );
          }),
      )
      .addCommand("edytuj", (command) =>
        command
          .setDescription("Edytuj głosowanie")
          .addInteger("id", (id) => id.setDescription("ID głosowania"))
          .handle(async ({ prisma }, { id }, itx) => {
            if (!itx.inCachedGuild()) return;

            const poll = await prisma.dmPoll.findFirst({
              where: { id },
              include: { options: true },
            });
            if (poll === null) {
              return await errorFollowUp(itx, "Nie znaleziono głosowania o podanym ID");
            }
            if (poll.startedAt) {
              return await errorFollowUp(
                itx,
                "Nie można edytować rozpoczętego głosowania",
              );
            }

            const modal = new ModalBuilder()
              .setCustomId(`edit-poll-${poll.id}`)
              .setTitle(`Edycja głosowania [${poll.id}]`)
              .addComponents(...getPollCreateOrUpdateActionRows(poll));
            await itx.showModal(modal);

            const submitAction = await itx.awaitModalSubmit({ time: 60_000 * 10 });
            await submitAction.deferReply();

            // TODO)) Abstract this into a helper/common util
            const title = submitAction.components
              .at(0)
              ?.components.find((c) => c.customId === "title")?.value;
            const content = submitAction.components
              .at(1)
              ?.components.find((c) => c.customId === "content")?.value;
            const rawFirstRowOptions = submitAction.components
              .at(2)
              ?.components.find((c) => c.customId === "row1")?.value;
            const rawSecondRowOptions = submitAction.components
              .at(3)
              ?.components.find((c) => c.customId === "row2")?.value;

            if (!title || !content || !rawFirstRowOptions) {
              return await errorFollowUp(
                submitAction,
                "Nie podano wszystkich wymaganych danych!",
              );
            }

            const firstRowOptions = rawFirstRowOptions
              .split("\n")
              .map((option) => option.trim());

            if (firstRowOptions.length > 5) {
              return await errorFollowUp(
                submitAction,
                "Podano za dużo opcji w pierwszym rzędzie. Maksymalna liczba opcji to 5.",
              );
            }

            const secondRowOptions = rawSecondRowOptions
              ? rawSecondRowOptions.split("\n").map((option) => option.trim())
              : [];

            if (secondRowOptions.length > 5) {
              return await errorFollowUp(
                submitAction,
                "Podano za dużo opcji w drugim rzędzie. Maksymalna liczba opcji to 5.",
              );
            }

            const options = [
              ...firstRowOptions.map((option) => ({ option, row: 0 })),
              ...secondRowOptions.map((option) => ({ option, row: 1 })),
            ];

            await prisma.dmPoll.update({
              where: { id },
              data: {
                title,
                content,
                options: {
                  deleteMany: { id: { in: poll.options.map((option) => option.id) } },
                  createMany: { data: options },
                },
              },
            });

            await submitAction.editReply(
              `Zaktualizowano głosowanie ${italic(title)} z ${bold(options.length.toString())} opcjami.`,
            );
          }),
      )
      .addCommand("lista", (command) =>
        command
          .setDescription("Wyświetl listę głosowań")
          .handle(async ({ prisma }, _params, itx) => {
            if (!itx.inCachedGuild()) return;

            const paginator = new DatabasePaginator(
              (props, createdAt) =>
                prisma.dmPoll.findMany({
                  ...props,
                  orderBy: { createdAt },
                  include: { options: true },
                }),
              () => prisma.dmPoll.count(),
              { pageSize: 3, defaultOrder: PaginatorOrder.DESC },
            );

            const formatPoll = (poll: DMPollWithOptions, _idx: number) => {
              const lines = [
                `### ${poll.title} [${getDmPollStatus(poll)}] [${poll.id}]`,
              ];
              if (poll.startedAt) {
                lines.push(
                  `**Rozpoczęto**: ${time(poll.startedAt, TimestampStyles.ShortDateTime)}`,
                );
              }
              if (poll.finishedAt) {
                lines.push(
                  `**Zakończono**: ${time(poll.finishedAt, TimestampStyles.ShortDateTime)}`,
                );
              }
              const firstRowOptions = poll.options.filter((o) => o.row === 0);
              lines.push(
                `**Opcje (${firstRowOptions.length.toString()})**: ${firstRowOptions
                  .map((o) => o.option)
                  .join(", ")}`,
              );

              const secondRowOptions = poll.options.filter((o) => o.row === 1);

              if (secondRowOptions.length > 0) {
                lines.push(
                  `**Opcje (${secondRowOptions.length.toString()})**: ${secondRowOptions
                    .map((o) => o.option)
                    .join(", ")}`,
                );
              }

              lines.push(`**Treść**: ${italic(poll.content)}`);
              return lines.join("\n");
            };

            const view = new PaginatedView(
              paginator,
              "Głosowania DM",
              formatPoll,
              false,
            );
            await view.render(itx);
          }),
      )
      .addCommand("sprawdz", (command) =>
        command
          .setDescription("Sprawdź szczegóły głosowania")
          .addInteger("id", (id) => id.setDescription("ID głosowania"))
          .handle(async ({ prisma }, { id }, itx) => {
            if (!itx.inCachedGuild()) return;

            const poll = await prisma.dmPoll.findFirst({
              where: { id },
              include: {
                options: { include: { votes: true } },
                participants: true,
              },
            });
            if (poll === null) {
              return await errorFollowUp(itx, "Nie znaleziono głosowania o podanym ID");
            }

            await itx.deferReply();

            const embed = new EmbedBuilder()
              .setTitle(`Głosowanie ${poll.title} [${getDmPollStatus(poll)}]`)
              .setDescription(poll.content)
              .setFooter({ text: `ID: ${poll.id}` });

            if (!poll.startedAt) {
              embed.addFields([
                {
                  name: "Opcje",
                  value: poll.options
                    .map((option) => `${bold(option.option)} - rząd ${option.row + 1}`)
                    .join("\n"),
                },
              ]);
            } else if (poll.startedAt) {
              const totalVotes = poll.options.reduce(
                (acc, option) => acc + option.votes.length,
                0,
              );
              const optionResults: string[] = [];
              for (const option of poll.options) {
                const percentage =
                  totalVotes === 0 ? 0 : (option.votes.length / totalVotes) * 100;
                const votingUsersHastebinUrl = await hastebin(
                  option.votes.map(({ userId }) => userId).join("\n"),
                );
                if (option.votes.length === 0) {
                  optionResults.push(
                    `${bold(option.option)}: ${option.votes.length} (${percentage.toFixed(0)}%)`,
                  );
                } else {
                  optionResults.push(
                    `${bold(option.option)}: [${option.votes.length}](${votingUsersHastebinUrl}) (${percentage.toFixed(0)}%)`,
                  );
                }
              }

              // Is in the role and received the message
              const eliglibleParticipants = poll.participants.filter(
                (p) => p.messageId !== null,
              );
              embed.addFields([
                {
                  name: `Odpowiedzi (${totalVotes}/${eliglibleParticipants.length})`,
                  value: optionResults.join("\n"),
                },
              ]);

              if (totalVotes < eliglibleParticipants.length) {
                // Eliglible (message was delivered), but not yet voted
                const notYetVoted = eliglibleParticipants.filter(
                  (p) =>
                    !poll.options
                      .flatMap((o) => o.votes)
                      .some((v) => v.userId === p.userId),
                );
                const hastebinUrl = await hastebin(
                  notYetVoted.map(({ userId }) => userId).join("\n"),
                );
                embed.addFields([
                  {
                    name: `Nie oddano głosu (${eliglibleParticipants.length - totalVotes})`,
                    value: hastebinUrl,
                  },
                ]);
              }

              // Is in the role, but failed to receive the message
              const failedParticipants = poll.participants.filter(
                (p) => p.messageId === null,
              );
              if (failedParticipants.length > 0) {
                const hastebinUrl = await hastebin(
                  failedParticipants.map(({ userId }) => userId).join("\n"),
                );
                embed.addFields([
                  {
                    name: `Nieotrzymane wiadomości (${failedParticipants.length})`,
                    value: hastebinUrl,
                  },
                ]);
              }
            }

            await itx.editReply({ embeds: [embed] });
          }),
      )
      .addCommand("rozpocznij", (command) =>
        command
          .setDescription("Rozpocznij głosowanie")
          .addInteger("id", (id) => id.setDescription("ID głosowania"))
          .addRole("rola", (role) =>
            role.setDescription("Rola, w której użytkownicy mogą głosować"),
          )
          .handle(async ({ prisma }, { id, rola: role }, itx) => {
            if (!itx.inCachedGuild()) return;

            const poll = await prisma.dmPoll.findFirst({
              where: { id },
              include: { options: true },
            });
            if (poll === null) {
              return await errorFollowUp(itx, "Nie znaleziono głosowania o podanym ID");
            }

            if (poll.startedAt) {
              return await errorFollowUp(
                itx,
                `Głosowanie zostało już rozpoczęte (${time(poll.startedAt, TimestampStyles.LongDateTime)})`,
              );
            }
            if (poll.finishedAt) {
              return await errorFollowUp(
                itx,
                `Głosowanie zostało już zakończone (${time(poll.finishedAt, TimestampStyles.LongDateTime)})`,
              );
            }

            const firstRowOptions = poll.options.filter((o) => o.row === 0);
            const firstRowButtons = firstRowOptions.map((option, i) => {
              return new ButtonBuilder()
                .setLabel(option.option)
                .setCustomId(`vote-option:${option.id}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(numberToEmoji(i + 1));
            });

            const secondRowOptions = poll.options.filter((o) => o.row === 1);
            const secondRowButtons = secondRowOptions.map((option, i) => {
              return new ButtonBuilder()
                .setLabel(option.option)
                .setCustomId(`vote-option:${option.id}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(numberToEmoji(firstRowOptions.length + i + 1));
            });

            const firstRowActionRow =
              new ActionRowBuilder<ButtonBuilder>().addComponents(...firstRowButtons);
            const secondRowActionRow =
              new ActionRowBuilder<ButtonBuilder>().addComponents(...secondRowButtons);

            await itx.deferReply();
            await ensureUsersExist(
              prisma,
              role.members.map((m) => m.id),
            );
            await prisma.$transaction(async (tx) => {
              await tx.dmPoll.update({
                where: { id },
                data: { startedAt: itx.createdAt },
              });
              // Save all eligible participants with empty message IDs
              await tx.dmPollParticipant.createMany({
                data: role.members.map((member) => ({
                  pollId: poll.id,
                  userId: member.id,
                  messageId: null,
                })),
              });
            });

            // Notify that the vote has started, but send messages in the background
            await itx.editReply(
              `Rozpoczęto głosowanie ${italic(poll.title)} [${poll.id}]. Wysyłanie wiadomości do użytkowników... (może to zająć parę minut)`,
            );

            const messageSendStatuses = await Promise.all(
              role.members.map(async (member) =>
                discordTry(
                  async () => {
                    const message = await member.send({
                      content: poll.content,
                      components: [firstRowActionRow, secondRowActionRow],
                    });
                    return { member, messageId: message.id };
                  },
                  [RESTJSONErrorCodes.CannotSendMessagesToThisUser],
                  () => ({ member, messageId: null }),
                ),
              ),
            );

            const successfullySentMessages = messageSendStatuses.filter(
              (m) => m.messageId !== null,
            );
            // Save outgoing message IDs for participants with successfully sent messages
            for (const { member, messageId } of successfullySentMessages) {
              await prisma.dmPollParticipant.update({
                where: { pollId_userId: { pollId: poll.id, userId: member.id } },
                data: { messageId },
              });
            }

            const lines = [
              `Rozesłano wiadomości do głosowania ${italic(poll.title)} [${poll.id}]. Wysłano wiadomość do ${bold(
                successfullySentMessages.length.toString(),
              )}/${bold(messageSendStatuses.length.toString())} użytkowników.`,
            ];

            if (successfullySentMessages.length < messageSendStatuses.length) {
              const failedToSendMessages = messageSendStatuses.filter(
                (m) => m.messageId === null,
              );
              lines.push(
                `Nie udało się wysłać wiadomości do:\n${failedToSendMessages
                  .map(({ member }) => `${member.user.tag} ${member.user.id}`)
                  .join("\n")}`,
              );
            }

            await itx.user.createDM();
            if (!itx.user.dmChannel) return;
            await itx.user.dmChannel.send(lines.join("\n"));
          }),
      )
      .addCommand("przypomnij", (command) =>
        command
          .setDescription(
            "Przypomnij o głosowaniu użytkownikom, którzy jeszcze nie zagłosowali",
          )
          .addInteger("id", (id) => id.setDescription("ID głosowania"))
          .addString("content", (content) =>
            content
              .setDescription("Niestandardowa treść przypomnienia")
              .setRequired(false),
          )
          .handle(async ({ prisma }, { id, content: providedContent }, itx) => {
            if (!itx.inCachedGuild()) return;

            const poll = await prisma.dmPoll.findFirst({
              where: { id },
              include: { participants: true, options: { include: { votes: true } } },
            });
            if (poll === null) {
              return await errorFollowUp(itx, "Nie znaleziono głosowania o podanym ID");
            }

            if (!poll.startedAt) {
              return await errorFollowUp(
                itx,
                "Głosowanie nie zostało jeszcze rozpoczęte.",
              );
            }
            if (poll.finishedAt) {
              return await errorFollowUp(
                itx,
                `Głosowanie zostało już zakończone (${time(poll.finishedAt, TimestampStyles.LongDateTime)})`,
              );
            }

            await itx.deferReply();
            const members = await fetchMembers(
              itx.guild,
              poll.participants
                .filter(
                  (p) =>
                    !poll.options
                      .flatMap((o) => o.votes)
                      .some((v) => v.userId === p.userId),
                )
                .map((p) => p.userId),
            );
            const messageSendStatuses = await Promise.all(
              members.map(async (member) => {
                const participant = poll.participants.find(
                  (p) => p.userId === member.id && p.messageId !== null,
                );
                if (!participant) return { member, messageId: null };
                const { messageId } = participant;
                if (!messageId) return { member, messageId: null };
                const channel = await member.createDM();
                return await discordTry(
                  async () => {
                    const content =
                      providedContent ??
                      `Hej ${userMention(member.id)}, przypominam Ci o głosowaniu, bo Twój głos nie został jeszcze oddany.`;
                    const message = await member.send({
                      content: `${content}\nPrzejdź do głosowania: ${messageLink(channel.id, messageId)} i wybierz jedną z opcji klikając w przycisk. Miłego dnia! :heart:`,
                      reply: { messageReference: messageId },
                    });
                    return { member, messageId: message.id };
                  },
                  [RESTJSONErrorCodes.CannotSendMessagesToThisUser],
                  () => ({ member, messageId: null }),
                );
              }),
            );

            const successfullySentMessages = messageSendStatuses.filter(
              (m) => m.messageId !== null,
            );
            const lines = [
              `Wysłano przypomnienie o głosowaniu do ${bold(
                successfullySentMessages.length.toString(),
              )}/${bold(messageSendStatuses.length.toString())} użytkowników.`,
            ];

            if (successfullySentMessages.length < messageSendStatuses.length) {
              const failedToSendMessages = messageSendStatuses.filter(
                (m) => m.messageId === null,
              );
              lines.push(
                `Nie udało się wysłać wiadomości do:\n${failedToSendMessages
                  .map(({ member }) => `${member.user.tag} ${member.user.id}`)
                  .join("\n")}`,
              );
            }

            await itx.editReply(lines.join("\n"));
          }),
      )
      .addCommand("zakoncz", (command) =>
        command
          .setDescription("Zakończ głosowanie")
          .addInteger("id", (id) => id.setDescription("ID głosowania"))
          .handle(async ({ prisma }, { id }, itx) => {
            if (!itx.inCachedGuild()) return;

            const poll = await prisma.$transaction(async (tx) => {
              const poll = await tx.dmPoll.findFirst({
                where: { id, startedAt: { not: null }, finishedAt: null },
                include: { participants: true },
              });
              if (poll === null) {
                await errorFollowUp(
                  itx,
                  "Nie znaleziono aktywnego głosowania o podanym ID",
                );
                return null;
              }

              await tx.dmPoll.update({
                where: { id },
                data: { finishedAt: itx.createdAt },
              });

              return poll;
            });
            if (!poll) return;

            // Remove buttons and add a footer to all outgoing messages
            await Promise.all(
              poll.participants.map(async ({ userId, messageId }) => {
                if (messageId === null) return;
                await discordTry(
                  async () => {
                    const user = await itx.client.users.fetch(userId);
                    await user.createDM();
                    if (!user.dmChannel) return;
                    const message = await user.dmChannel.messages.fetch(messageId);
                    const content = `${message.content}\n\n*Głosowanie skończyło się ${time(itx.createdAt, TimestampStyles.RelativeTime)}*`;
                    await message.edit({ content, components: [] });
                  },
                  [
                    RESTJSONErrorCodes.UnknownUser,
                    RESTJSONErrorCodes.UnknownChannel,
                    RESTJSONErrorCodes.UnknownMessage,
                  ],
                  () => {
                    console.log(
                      `Failed to delete message ${messageId} for user ${userId}`,
                    );
                  },
                );
              }),
            );

            await itx.reply(`Zakończono głosowanie ${italic(poll.title)} [${poll.id}]`);
          }),
      ),
  )
  .handle("ready", async ({ prisma }, client) => {
    client.on("interactionCreate", async (itx) => {
      if (!itx.isButton()) return;
      // vote-option:optionId
      if (!itx.customId.startsWith("vote-option:")) return;

      await itx.deferReply({ ephemeral: true });

      const [_, rawOptionId] = itx.customId.split(":");
      if (!rawOptionId) {
        console.error("Invalid customId for vote-option button:", itx.customId);
        await itx.editReply("Coś poszło nie tak...");
        return;
      }
      const optionId = Number.parseInt(rawOptionId, 10);

      await prisma.$transaction(async (tx) => {
        const option = await tx.dmPollOption.findFirst({
          where: { id: optionId },
          include: { poll: true },
        });
        if (!option) {
          console.error("Invalid optionId for vote-option button:", optionId);
          await itx.editReply("Coś poszło nie tak...");
          return;
        }

        if (option.poll.finishedAt) {
          await itx.editReply("Głosowanie zostało zakończone.");
          return;
        }

        const participant = await tx.dmPollParticipant.findFirst({
          where: {
            userId: itx.user.id,
            poll: { options: { some: { id: optionId } } },
          },
        });
        if (!participant) {
          await itx.editReply("Nie możesz wziąć udziału w tym głosowaniu");
          return;
        }

        const { count: deletedCount } = await tx.dmPollVote.deleteMany({
          where: { userId: itx.user.id, option: { pollId: option.pollId } },
        });
        const vote = await tx.dmPollVote.create({
          data: { userId: itx.user.id, optionId },
          include: { option: true },
        });

        if (deletedCount > 0) {
          await itx.editReply(`Zmieniono głos na ${bold(vote.option.option)}`);
        } else {
          await itx.editReply(`Oddano głos na ${bold(vote.option.option)}`);
        }
      });
    });
  });
