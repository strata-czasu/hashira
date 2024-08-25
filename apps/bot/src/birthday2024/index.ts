import { Hashira, PaginatedView } from "@hashira/core";
import {
  type BirthdayEventStage2024,
  DatabasePaginator,
  type ExtendedPrismaClient,
  schema,
} from "@hashira/db";
import { count } from "@hashira/db/drizzle";
import {
  ActionRowBuilder,
  type BaseMessageOptions,
  ButtonBuilder,
  ButtonStyle,
  HeadingLevel,
  channelMention,
  codeBlock,
  heading,
  inlineCode,
  userMention,
} from "discord.js";
import { intersection, randomInt } from "es-toolkit";
import { base } from "../base";
import { sendDirectMessage } from "../util/sendDirectMessage";

const INSTRUCTION_CHANNEL_ID = "1268218097605541898";

const NON_PARTICIPANT_MESSAGE = [
  heading(
    "Hej, teraz jestem bardzo, ale to bardzo zajęty. Rozwiązuję tajemnice tego serwera...",
    HeadingLevel.Three,
  ),
  `Jeżeli chcesz mnie wesprzeć. Sprawdź info tutaj: ${channelMention(INSTRUCTION_CHANNEL_ID)}`,
  "Jeżeli już mi pomagasz, to pewnie nie to czego szukamy. Pomyśl! To musi być gdzieś blisko!",
].join("\n");

type ReplaceCtx = {
  userId: string;
};

const replacers: Record<string, (ctx: ReplaceCtx) => string> = {
  "\\n": () => "\n",
  "{{user}}": ({ userId }) => `<@${userId}>`,
};

const runReplacers = (content: string, ctx: ReplaceCtx) => {
  let result = content;
  for (const [key, replacer] of Object.entries(replacers)) {
    result = result.replaceAll(key, replacer(ctx));
  }

  return result;
};

const readComponents = (
  stage: BirthdayEventStage2024,
): ActionRowBuilder<ButtonBuilder>[] => {
  if (stage.buttons.length === 0) return [];

  const actionRow = new ActionRowBuilder<ButtonBuilder>();
  // Split buttons into label and customId
  const buttons = stage.buttons.map((button) => button.split(":"));
  for (const [label, customId] of buttons) {
    if (!label || !customId) {
      throw new Error("Invalid button format");
    }

    const randomEnding = randomInt(1000, 9999);

    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`${customId}_${randomEnding}`)
        .setLabel(label)
        .setStyle(ButtonStyle.Primary),
    );
  }

  return [actionRow];
};

const completeStage = async (
  prisma: ExtendedPrismaClient,
  stage: BirthdayEventStage2024,
  authorId: string,
  reply: (options: BaseMessageOptions) => Promise<void>,
) => {
  const content = runReplacers(stage.outputRequirementsValid, { userId: authorId });
  const components = readComponents(stage);

  await reply({ content, components });

  await prisma.birthdayEventStage2024Completion.create({
    data: { userId: authorId, stageId: stage.id },
  });
};

const handleStageInput = async (
  prisma: ExtendedPrismaClient,
  authorId: string,
  content: string,
  reply: (options: BaseMessageOptions) => Promise<void>,
) => {
  const lastFinishedStages = await prisma.birthdayEventStage2024Completion.findMany({
    where: { userId: authorId },
    orderBy: { timestamp: "desc" },
  });

  const mentionedStage = await prisma.birthdayEventStage2024.findFirst({
    where: { keyword: content.toLowerCase() },
  });

  if (!mentionedStage) {
    return await reply({ content: NON_PARTICIPANT_MESSAGE });
  }

  const lastStagesIds = lastFinishedStages.map((stage) => stage.stageId);

  if (lastStagesIds.includes(mentionedStage.id)) {
    return await reply({ content: "Już rozwiązałxś ten etap!" });
  }

  const isLocked = intersection(mentionedStage.lockedBy, lastStagesIds).length > 0;

  if (isLocked) {
    return await reply({ content: "Ten etap jest zablokowany przez twój inny wybór" });
  }

  if (
    mentionedStage.requiredStageId &&
    !lastStagesIds.includes(mentionedStage.requiredStageId)
  ) {
    if (mentionedStage.outputRequirementsInvalid) {
      const content = runReplacers(mentionedStage.outputRequirementsInvalid, {
        userId: authorId,
      });
      await reply({ content });
    }

    return;
  }

  await completeStage(prisma, mentionedStage, authorId, reply);
};

export const birthday2024 = new Hashira({ name: "birthday-2024" })
  .use(base)
  .group("birthday-2024", (group) =>
    group
      .setDescription("Komendy związane z urodzinami 2024")
      .setDefaultMemberPermissions(0)
      .addCommand("add-stage", (command) =>
        command
          .setDescription("Dodaje etap urodzin 2024")
          .addString("keyword", (option) => option.setDescription("Słowo kluczowe"))
          .addString("output-requirements-valid", (option) =>
            option.setDescription("Wymagania dla poprawnego rozwiązania"),
          )
          .addString("output-requirements-invalid", (option) =>
            option
              .setRequired(false)
              .setDescription("Wymagania dla niepoprawnego rozwiązania"),
          )
          .addInteger("required-stage-id", (option) =>
            option.setRequired(false).setDescription("ID wymaganego etapu"),
          )
          .addString("buttons", (option) =>
            option
              .setRequired(false)
              .setDescription("Przyciski w formacie LABEL:ID, oddzielone `|`"),
          )
          .handle(
            async (
              { prisma },
              {
                keyword,
                "output-requirements-valid": outputRequirementsValid,
                "output-requirements-invalid": outputRequirementsInvalid,
                "required-stage-id": requiredStageId,
                buttons,
              },
              itx,
            ) => {
              const stage = await prisma.birthdayEventStage2024.create({
                data: {
                  keyword,
                  outputRequirementsValid,
                  outputRequirementsInvalid,
                  requiredStageId,
                  buttons: buttons ? buttons.split("|") : [],
                },
              });

              await itx.reply(`Dodano etap ${inlineCode(stage.id.toString())}`);
            },
          ),
      )
      .addCommand("list-stages", (command) =>
        command
          .setDescription("Lista etapów urodzin 2024")
          .handle(async ({ prisma }, _, itx) => {
            const paginator = new DatabasePaginator({
              pageSize: 5,
              orderBy: [schema.BirthdayEventStage2024.id],
              select: prisma.$drizzle
                .select()
                .from(schema.BirthdayEventStage2024)
                .$dynamic(),
              count: prisma.$drizzle
                .select({ count: count() })
                .from(schema.BirthdayEventStage2024)
                .$dynamic(),
            });

            const extractButtons = (row: BirthdayEventStage2024) => {
              return row.buttons.map((button) => button.split(":")[1]);
            };

            const formatStage = (row: BirthdayEventStage2024) => {
              return [
                heading(`${row.keyword} (${row.id})`, HeadingLevel.Three),
                `Wiadomość udanej próby: ${row.outputRequirementsValid}`,
                `Wiadomość nieudanej próby: ${row.outputRequirementsInvalid ?? "Brak"}`,
                `Wymagany etap: ${row.requiredStageId ?? "Brak"}`,
                `Przyciski: ${row.buttons.length > 0 ? extractButtons(row) : "Brak"}`,
                `Zablokowane przez: ${row.lockedBy.length > 0 ? row.lockedBy.join(", ") : "Brak"}`,
              ].join("\n");
            };

            const paginate = new PaginatedView(
              paginator,
              "Etapy urodzin 2024",
              formatStage,
              true,
            );

            await paginate.render(itx);
          }),
      )
      .addCommand("edit-stage", (command) =>
        command
          .setDescription("Edytuje etap urodzin 2024")
          .addInteger("id", (option) => option.setDescription("ID etapu"))
          .addString("keyword", (option) =>
            option.setRequired(false).setDescription("Słowo kluczowe"),
          )
          .addString("output-requirements-valid", (option) =>
            option
              .setRequired(false)
              .setDescription("Wymagania dla poprawnego rozwiązania"),
          )
          .addString("output-requirements-invalid", (option) =>
            option
              .setRequired(false)
              .setDescription("Wymagania dla niepoprawnego rozwiązania"),
          )
          .addInteger("required-stage-id", (option) =>
            option.setRequired(false).setDescription("ID wymaganego etapu"),
          )
          .addString("buttons", (option) =>
            option
              .setRequired(false)
              .setDescription("Przyciski w formacie LABEL:ID, oddzielone `|`"),
          )
          .addString("locked-by", (option) =>
            option
              .setRequired(false)
              .setDescription("ID etapów, które blokują ten etap (oddzielone `|`)"),
          )
          .handle(
            async (
              { prisma },
              {
                id,
                keyword,
                "output-requirements-valid": outputRequirementsValid,
                "output-requirements-invalid": outputRequirementsInvalid,
                "required-stage-id": requiredStageId,
                buttons,
                "locked-by": lockedBy,
              },
              itx,
            ) => {
              const updateData = {
                ...(keyword ? { keyword } : {}),
                ...(outputRequirementsValid ? { outputRequirementsValid } : {}),
                ...(outputRequirementsInvalid ? { outputRequirementsInvalid } : {}),
                ...(requiredStageId ? { requiredStageId } : {}),
                ...(buttons ? { buttons: buttons.split("|") } : {}),
                ...(lockedBy
                  ? {
                      lockedBy: lockedBy
                        .split("|")
                        .map((it) => Number.parseInt(it, 10)),
                    }
                  : {}),
              };

              if (Object.keys(updateData).length === 0) {
                await itx.reply("Nie podano żadnych danych do edycji");
                return;
              }

              const stage = await prisma.birthdayEventStage2024.update({
                where: { id },
                data: updateData,
              });

              await itx.reply(`Edytowano etap ${inlineCode(stage.id.toString())}`);
            },
          ),
      )
      .addCommand("mermaid-graph", (command) =>
        command
          .setDescription("Generuje graf etapów urodzin 2024 w formacie Mermaid")
          .handle(async ({ prisma }, _, itx) => {
            const stages = await prisma.birthdayEventStage2024.findMany();

            const nodes = stages.map((stage) => {
              return `  ${stage.id}["${stage.keyword}"]`;
            });

            const edges = stages
              .filter((stage) => stage.requiredStageId)
              .map((stage) => {
                return `  ${stage.requiredStageId} --> ${stage.id}`;
              });

            const graph = ["graph TD", ...nodes, ...edges].join("\n");

            await itx.reply(codeBlock("mermaid", graph));
          }),
      )
      .addCommand("notify-participants", (command) =>
        command
          .setDescription("Powiadamia uczestników o urodzinach 2024")
          .addString("message", (option) =>
            option.setDescription("Wiadomość do wysłania"),
          )
          .addInteger("stage-id", (option) =>
            option
              .setRequired(false)
              .setDescription("ID etapu, który uczestnicy ukończyli"),
          )
          .handle(async ({ prisma }, { message, "stage-id": stageId }, itx) => {
            await itx.deferReply();
            const where = stageId ? { stageId } : {};
            const participants = await prisma.birthdayEventStage2024Completion.findMany(
              { ...where, distinct: ["userId"] },
            );

            const sendDmPromises = participants.map(async ({ userId }) => {
              const content = runReplacers(message, { userId });
              const user = await itx.client.users.fetch(userId);
              return [await sendDirectMessage(user, content), user.id] as const;
            });

            const results = await Promise.all(sendDmPromises);

            const failed = results.filter(([success]) => !success);

            if (failed.length > 0) {
              await itx.editReply(
                `Wysłano powiadomienia do ${participants.length} uczestników, ale nie udało się wysłać do: ${failed
                  .map(([, userId]) => userMention(userId))
                  .join(", ")}`,
              );
              return;
            }

            await itx.editReply(
              `Wysłano powiadomienia do ${participants.length} uczestników`,
            );
          }),
      ),
  )
  .handle("messageCreate", async ({ prisma }, message) => {
    if (message.author.bot) return;
    if (message.inGuild()) return;

    await handleStageInput(
      prisma,
      message.author.id,
      message.content,
      async (options) => {
        await message.reply(options);
      },
    );
  })
  .handle("ready", async ({ prisma }, client) => {
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isButton()) return;

      const customId = interaction.customId.split("_")[0];

      if (!customId) return;

      const matchingStage = await prisma.birthdayEventStage2024.findFirst({
        where: { keyword: customId },
      });

      if (!matchingStage) return;

      await handleStageInput(
        prisma,
        interaction.user.id,
        matchingStage.keyword,
        async (options) => {
          await interaction.reply(options);
        },
      );
    });
  });
