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
  time,
  userMention,
} from "discord.js";
import { base } from "./base";
import { discordTry } from "./util/discordTry";
import { ensureUsersExist } from "./util/ensureUsersExist";
import { errorFollowUp } from "./util/errorFollowUp";

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

  const optionsInput = new TextInputBuilder()
    .setCustomId("options")
    .setLabel("Opcje (oddzielone nowymi liniami, max. 5)")
    .setPlaceholder("Użytkownik 1\nUżytkownik 2\nUżytkownik 3")
    .setRequired(true)
    .setMinLength(2)
    .setMaxLength(256)
    .setStyle(TextInputStyle.Paragraph);

  if (poll) {
    titleInput.setValue(poll.title);
    contentInput.setValue(poll.content);
    optionsInput.setValue(poll.options.map((o) => o.option).join("\n"));
  }

  const inputs = [titleInput, contentInput, optionsInput];
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
            const rawOptions = submitAction.components
              .at(2)
              ?.components.find((c) => c.customId === "options")?.value;
            if (!title || !content || !rawOptions) {
              return await errorFollowUp(
                submitAction,
                "Nie podano wszystkich wymaganych danych!",
              );
            }

            const options = rawOptions.split("\n").map((option) => option.trim());
            if (options.length > 5) {
              return await errorFollowUp(
                submitAction,
                "Podano za dużo opcji. Maksymalna liczba opcji to 5.",
              );
            }

            const poll = await prisma.dmPoll.create({
              data: {
                createdById: itx.user.id,
                title,
                content,
                options: {
                  createMany: {
                    data: options.map((option) => ({ option })),
                  },
                },
              },
            });

            await submitAction.editReply(
              `Utworzono głosowanie ${italic(poll.title)} z ${bold(options.length.toString())} opcjami.`,
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
            const rawOptions = submitAction.components
              .at(2)
              ?.components.find((c) => c.customId === "options")?.value;
            if (!title || !content || !rawOptions) {
              return await errorFollowUp(
                submitAction,
                "Nie podano wszystkich wymaganych danych!",
              );
            }

            const options = rawOptions.split("\n").map((option) => option.trim());
            if (options.length > 5) {
              return await errorFollowUp(
                submitAction,
                "Podano za dużo opcji. Maksymalna liczba opcji to 5.",
              );
            }

            await prisma.dmPoll.update({
              where: { id },
              data: {
                title,
                content,
                options: {
                  deleteMany: { id: { in: poll.options.map((option) => option.id) } },
                  createMany: { data: options.map((option) => ({ option })) },
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
              lines.push(
                `**Opcje (${poll.options.length.toString()})**: ${poll.options.map((o) => o.option).join(", ")}`,
              );
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
                  value: poll.options.map((option) => bold(option.option)).join("\n"),
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
                optionResults.push(
                  `${bold(option.option)}: ${option.votes.length} (${percentage.toFixed(0)}%)`,
                );
              }

              // Participants who received the message
              const eliglibleParticipants = poll.participants.filter(
                (p) => p.messageId !== null,
              );
              embed.addFields([
                {
                  name: `Odpowiedzi (${totalVotes}/${eliglibleParticipants.length})`,
                  value: optionResults.join("\n"),
                },
              ]);

              const failedParticipants = poll.participants.filter(
                (p) => p.messageId === null,
              );
              if (failedParticipants.length > 0) {
                embed.addFields([
                  {
                    name: `Nieotrzymane wiadomości (${failedParticipants.length})`,
                    value: failedParticipants
                      .map(({ userId }) => `${userMention(userId)} (${userId})`)
                      .join("\n"),
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

            const buttons = poll.options.map((option) =>
              new ButtonBuilder()
                .setLabel(option.option)
                .setCustomId(`vote-option:${option.id}`)
                .setStyle(ButtonStyle.Primary),
            );
            const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
              buttons,
            );

            await itx.deferReply();
            const messageSendStatuses = await prisma.$transaction(async (tx) => {
              await tx.dmPoll.update({
                where: { id },
                data: { startedAt: itx.createdAt },
              });

              const messageSendStatuses = await Promise.all(
                role.members.map(async (member) =>
                  discordTry(
                    async () => {
                      const message = await member.send({
                        content: poll.content,
                        components: [actionRow],
                      });
                      return { member, messageId: message.id };
                    },
                    [RESTJSONErrorCodes.CannotSendMessagesToThisUser],
                    () => ({ member, messageId: null }),
                  ),
                ),
              );

              // Save participants with outgoing message IDs - null if failed to send
              await ensureUsersExist(
                prisma,
                role.members.map((m) => m.id),
              );
              await tx.dmPollParticipant.createMany({
                data: messageSendStatuses.map(({ member, messageId }) => ({
                  pollId: poll.id,
                  userId: member.id,
                  messageId,
                })),
              });

              // Should contain all members in the role, but some may have messageId: null
              return messageSendStatuses;
            });

            const successfullySentMessages = messageSendStatuses.filter(
              (m) => m.messageId !== null,
            );
            const lines = [
              `Rozpoczęto głosowanie ${italic(poll.title)} [${poll.id}]. Wysłano wiadomość do ${bold(
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
                      const content = `${message.content}\n\n*Głosowanie skończyło się ${time(itx.createdAt, TimestampStyles.RelativeTime)}*.`;
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

              return poll;
            });
            if (!poll) return;

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
