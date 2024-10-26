import { Hashira, PaginatedView } from "@hashira/core";
import { type DMPoll, type DMPollOption, DatabasePaginator } from "@hashira/db";
import { PaginatorOrder } from "@hashira/paginate";
import {
  ActionRowBuilder,
  type ModalActionRowComponentBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  TimestampStyles,
  bold,
  italic,
  time,
} from "discord.js";
import { base } from "./base";
import { errorFollowUp } from "./util/errorFollowUp";

type DMPollWithOptions = DMPoll & { options: DMPollOption[] };

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
    .setLabel("Opcje (oddzielone nowymi liniami)")
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

const getDmPollStatus = (poll: DMPoll) => {
  if (poll.startedAt && poll.finishedAt) {
    return "zakończono";
  }
  if (poll.startedAt && !poll.finishedAt) {
    return "w trakcie";
  }
  if (!poll.startedAt && !poll.finishedAt) {
    return "nie rozpoczęto";
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

            const poll = await prisma.dMPoll.create({
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

            const poll = await prisma.dMPoll.findFirst({
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

            await prisma.dMPoll.update({
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
                prisma.dMPoll.findMany({
                  ...props,
                  orderBy: { createdAt },
                  include: { options: true },
                }),
              () => prisma.dMPoll.count(),
              { pageSize: 1, defaultOrder: PaginatorOrder.DESC },
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
      ),
  );
