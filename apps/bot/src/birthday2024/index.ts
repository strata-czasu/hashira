import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, type db, schema } from "@hashira/db";
import { count, desc, eq } from "@hashira/db/drizzle";
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
} from "discord.js";
import { base } from "../base";

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
    result = content.replaceAll(key, replacer(ctx));
  }

  return result;
};

const readComponents = (
  stage: typeof schema.birthdayEvent2024Stage.$inferSelect,
): ActionRowBuilder<ButtonBuilder>[] => {
  if (stage.buttons.length === 0) return [];

  const actionRow = new ActionRowBuilder<ButtonBuilder>();
  // Split buttons into label and customId
  const buttons = stage.buttons.map((button) => button.split(":"));
  for (const [label, customId] of buttons) {
    if (!label || !customId) {
      throw new Error("Invalid button format");
    }

    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(label)
        .setStyle(ButtonStyle.Primary),
    );
  }

  return [actionRow];
};

const completeStage = async (
  database: typeof db,
  stage: typeof schema.birthdayEvent2024Stage.$inferSelect,
  authorId: string,
  reply: (options: BaseMessageOptions) => Promise<void>,
) => {
  await database.insert(schema.birthdayEvent2024StageCompletion).values({
    userId: authorId,
    stageId: stage.id,
  });

  const content = runReplacers(stage.outputRequirementsValid, { userId: authorId });
  const components = readComponents(stage);

  await reply({ content, components });
};

const handleStageInput = async (
  database: typeof db,
  authorId: string,
  content: string,
  reply: (options: BaseMessageOptions) => Promise<void>,
) => {
  const lastFinishedStages =
    await database.query.birthdayEvent2024StageCompletion.findMany({
      where: eq(schema.birthdayEvent2024StageCompletion.userId, authorId),
      orderBy: [desc(schema.birthdayEvent2024StageCompletion.timestamp)],
    });

  const mentionedStage = await database.query.birthdayEvent2024Stage.findFirst({
    where: eq(schema.birthdayEvent2024Stage.keyword, content.toLowerCase()),
  });

  if (!mentionedStage) {
    return await reply({ content: NON_PARTICIPANT_MESSAGE });
  }

  const lastStagesIds = lastFinishedStages.map((stage) => stage.stageId);

  if (lastStagesIds.includes(mentionedStage.id)) {
    return await reply({ content: "Już rozwiązałeś to zadanie!" });
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

  await completeStage(database, mentionedStage, authorId, reply);
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
              .setDescription("Przyciski w formacie LABEL:ID, oddzielone przecinkami"),
          )
          .handle(
            async (
              { db },
              {
                keyword,
                "output-requirements-valid": outputRequirementsValid,
                "output-requirements-invalid": outputRequirementsInvalid,
                "required-stage-id": requiredStageId,
                buttons,
              },
              itx,
            ) => {
              const [stage] = await db
                .insert(schema.birthdayEvent2024Stage)
                .values({
                  keyword,
                  outputRequirementsValid,
                  outputRequirementsInvalid,
                  requiredStageId,
                  buttons: buttons ? buttons.split(",") : [],
                })
                .returning();

              if (!stage) {
                await itx.reply("Nie udało się dodać etapu");
                return;
              }

              await itx.reply(`Dodano etap ${inlineCode(stage.id.toString())}`);
            },
          ),
      )
      .addCommand("list-stages", (command) =>
        command
          .setDescription("Lista etapów urodzin 2024")
          .handle(async ({ db }, _, itx) => {
            const paginator = new DatabasePaginator({
              orderBy: [schema.birthdayEvent2024Stage.id],
              select: db.select().from(schema.birthdayEvent2024Stage).$dynamic(),
              count: db
                .select({ count: count() })
                .from(schema.birthdayEvent2024Stage)
                .$dynamic(),
            });

            const formatStage = (
              row: typeof schema.birthdayEvent2024Stage.$inferSelect,
            ) => {
              return [
                heading(`${row.keyword} (${row.id})`, HeadingLevel.Three),
                `Wiadomość udanej próby: ${row.outputRequirementsValid}`,
                `Wiadomość nieudanej próby: ${row.outputRequirementsInvalid ?? "Brak"}`,
                `Wymagany etap: ${row.requiredStageId ?? "Brak"}`,
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
              .setDescription("Przyciski w formacie LABEL:ID, oddzielone przecinkami"),
          )
          .handle(
            async (
              { db },
              {
                id,
                keyword,
                "output-requirements-valid": outputRequirementsValid,
                "output-requirements-invalid": outputRequirementsInvalid,
                "required-stage-id": requiredStageId,
                buttons,
              },
              itx,
            ) => {
              const updateData = {
                ...(keyword ? { keyword } : {}),
                ...(outputRequirementsValid ? { outputRequirementsValid } : {}),
                ...(outputRequirementsInvalid ? { outputRequirementsInvalid } : {}),
                ...(requiredStageId ? { requiredStageId } : {}),
                ...(buttons ? { buttons: buttons.split(",") } : {}),
              };

              if (Object.keys(updateData).length === 0) {
                await itx.reply("Nie podano żadnych danych do edycji");
                return;
              }

              const [stage] = await db
                .update(schema.birthdayEvent2024Stage)
                .set(updateData)
                .where(eq(schema.birthdayEvent2024Stage.id, id))
                .returning();

              if (!stage) {
                await itx.reply("Nie udało się edytować etapu");
                return;
              }

              await itx.reply(`Edytowano etap ${inlineCode(stage.id.toString())}`);
            },
          ),
      )
      .addCommand("mermaid-graph", (command) =>
        command
          .setDescription("Generuje graf etapów urodzin 2024 w formacie Mermaid")
          .handle(async ({ db }, _, itx) => {
            const stages = await db.query.birthdayEvent2024Stage.findMany();

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
      ),
  )
  .handle("messageCreate", async ({ db }, message) => {
    if (message.author.bot) return;
    if (message.inGuild()) return;

    await handleStageInput(db, message.author.id, message.content, async (options) => {
      await message.reply(options);
    });
  })
  .handle("ready", async ({ db }, client) => {
    client.on("interactionCreate", async (interaction) => {
      if (!interaction.isButton()) return;

      const matchingStage = await db.query.birthdayEvent2024Stage.findFirst({
        where: eq(schema.birthdayEvent2024Stage.keyword, interaction.customId),
      });

      if (!matchingStage) return;

      await handleStageInput(
        db,
        interaction.user.id,
        matchingStage.keyword,
        async (options) => {
          await interaction.reply(options);
        },
      );
    });
  });
