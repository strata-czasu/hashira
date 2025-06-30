import { Hashira } from "@hashira/core";
import { type Duration, addSeconds } from "date-fns";
import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  time,
} from "discord.js";
import { shuffle } from "es-toolkit";
import { base } from "./base";
import { parseDuration } from "./util/duration";
import { ensureUserExists } from "./util/ensureUsersExist";
import { waitForButtonClick } from "./util/singleUseButton";

type Reward = { amount: number; reward: string };

const giveaways = new Map<string, { rewards: Reward[]; users: string[] }>();

function parseRewards(input: string): Reward[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => {
      const match = item.match(/^(\d+)x\s*(.+)$/i);
      if (match) {
        const [, num, reward] = match;
        if (reward) return { amount: Number(num), reward: reward.trim() };
      }
      return { amount: 1, reward: item };
    });
}

function durationToSeconds(duration: Duration | null): number | undefined {
  return duration
    ? (duration.years ?? 0) * 365 * 24 * 3600 +
        (duration.months ?? 0) * 30 * 24 * 3600 +
        (duration.weeks ?? 0) * 7 * 24 * 3600 +
        (duration.days ?? 0) * 24 * 3600 +
        (duration.hours ?? 0) * 3600 +
        (duration.minutes ?? 0) * 60 +
        (duration.seconds ?? 0) * 1
    : undefined;
}

async function updateGiveaway(
  i: ButtonInteraction,
  giveaway:
    | {
        rewards: Reward[];
        users: string[];
      }
    | undefined,
  totalRewards: number,
) {
  if (giveaway && i.message.embeds[0]) {
    const updatedEmbed = EmbedBuilder.from(i.message.embeds[0]).setFooter({
      text: `Uczestnicy: ${giveaway.users.length} | Łącznie nagród: ${totalRewards}`,
    });
    await i.message.edit({ embeds: [updatedEmbed] });
  }
}

export const giveaway = new Hashira({ name: "giveaway" })
  .use(base)
  .command("givek", (command) =>
    command
      .setDMPermission(false)
      .setDescription("Tworzenie giveawayów z różnymi nagrodami")
      .addString("nagrody", (rewards) =>
        rewards.setDescription(
          "Nagrody do rozdania, oddzielone przecinkami, gdy nagród jest więcej to piszemy np. 2x200 punktów",
        ),
      )
      .addString("czas_trwania", (duration) =>
        duration.setDescription(
          "Czas trwania givka, np. 1d (1 dzień) lub 2h (2 godziny)",
        ),
      )
      .addString("tytul", (tytul) =>
        tytul
          .setDescription("Tytuł giveaway'a, domyślnie 'Giveaway'")
          .setRequired(false),
      )
      .handle(async ({ prisma }, { nagrody, czas_trwania, tytul }, itx) => {
        if (!itx.inCachedGuild()) return;
        await ensureUserExists(prisma, itx.user);

        const parsedRewards: Reward[] = parseRewards(nagrody);

        const parsedTime: Duration | null = parseDuration(czas_trwania);

        const durationSeconds = durationToSeconds(parsedTime);

        if (parsedTime === null || durationSeconds === undefined) {
          await itx.reply({
            content: "Podano nieprawidłowy czas",
            withResponse: true,
            flags: "Ephemeral",
          });

          return;
        }

        const startTime = Date.now();

        const totalRewards = parsedRewards.reduce((sum, r) => sum + r.amount, 0);

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle(tytul || "Giveaway")
          .setAuthor({
            name: `${itx.user.username}`,
            iconURL: itx.user.avatarURL() || "",
          })
          .setDescription(
            `${parsedRewards.map((r) => `${r.amount}x ${r.reward}`).join("\n")}
            \nKoniec ${time(addSeconds(startTime, durationSeconds), "R")}`,
          )
          .setFooter({ text: `Uczestnicy: 0 | Łącznie nagród: ${totalRewards}` });

        const confirmButton = new ButtonBuilder()
          .setCustomId("confirm_giveaway")
          .setLabel("Potwierdź poprawność")
          .setStyle(ButtonStyle.Secondary);

        const responseConfirm = await itx.reply({
          content: "Potwierdź jeśli wszystko się zgadza w giveawayu.",
          embeds: [embed],
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton),
          ],
          withResponse: true,
          flags: "Ephemeral",
        });

        if (!responseConfirm.resource?.message) {
          throw new Error("Failed to receive response from interaction reply");
        }

        const confirmation = await waitForButtonClick(
          responseConfirm.resource.message,
          "confirm_giveaway",
          { minutes: 1 },
          (interaction) => interaction.user.id === itx.user.id,
        );

        if (!confirmation.interaction) return;

        itx.deleteReply();

        const joinButton = new ButtonBuilder()
          .setCustomId("join_giveaway")
          .setLabel("Dołącz")
          .setStyle(ButtonStyle.Primary);

        const listButton = new ButtonBuilder()
          .setCustomId("list_giveaway")
          .setLabel("Lista uczestników")
          .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          joinButton,
          listButton,
        );

        const response = await itx.followUp({
          embeds: [embed],
          components: [row],
          withResponse: true,
        });

        if (!response) {
          throw new Error("Failed to receive response from interaction reply");
        }

        giveaways.set(response.id, {
          rewards: parsedRewards,
          users: [],
        });

        const btnCollector = response.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: durationSeconds * 1000 - (Date.now() - startTime),
        });

        btnCollector.on("collect", async (i) => {
          if (i.customId === "list_giveaway") {
            const giveaway = giveaways.get(i.message.id);
            if (giveaway) {
              const participants =
                giveaway.users.length > 0
                  ? giveaway.users.map((id) => `<@${id}>`).join(", ")
                  : "Brak uczestników";
              await i.reply({
                content: `Uczestnicy: ${participants}`,
                flags: "Ephemeral",
              });
            } else {
              await i.reply({
                content: "Ten giveaway już się zakończył!",
                flags: "Ephemeral",
              });
            }
            return;
          }

          if (i.customId !== "join_giveaway") return;

          if (!giveaways.has(i.message.id)) {
            await i.reply({
              content: "Ten giveaway już się zakończył!",
              flags: "Ephemeral",
            });
            return;
          }

          const leaveButton = new ButtonBuilder()
            .setCustomId("leave_giveaway")
            .setLabel("Wyjdź")
            .setStyle(ButtonStyle.Danger);

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(leaveButton);

          await i.deferReply({ flags: "Ephemeral" });

          let giveaway = giveaways.get(i.message.id);

          if (!giveaway) {
            await i.reply({
              content: "Ten giveaway już się zakończył!",
              flags: "Ephemeral",
            });
            return;
          }

          let message = "Już dołączyłxś do tego giveaway!";

          if (!giveaway.users.includes(i.user.id)) {
            giveaways.get(i.message.id)?.users.push(i.user.id);
            message = `${i.user} dołączyłx do giveaway!`;
            updateGiveaway(i, giveaway, totalRewards);
          }

          const joinResponse = await i.followUp({
            content: message,
            components: [row],
          });

          if (!joinResponse) {
            throw new Error("Failed to receive response from interaction reply");
          }

          const clickInfo = await waitForButtonClick(
            joinResponse,
            "leave_giveaway",
            { minutes: 1 },
            (interaction) => interaction.user.id === itx.user.id,
          );

          if (!clickInfo.interaction) return;

          // replying to original giveaway so user can jump to it instead of reply > reply > giveaway
          await clickInfo.interaction.deferReply({ flags: "Ephemeral" });
          await clickInfo.interaction.deleteReply();

          // refresh from map
          giveaway = giveaways.get(i.message.id);
          if (giveaway) {
            giveaway.users = giveaway.users.filter((userId) => userId !== i.user.id);

            await i.followUp({
              content: "Opuściłxś giveaway.",
              flags: "Ephemeral",
            });
          } else {
            await i.followUp({
              content: "Ten giveaway już się zakończył!",
              flags: "Ephemeral",
            });
          }

          updateGiveaway(i, giveaway, totalRewards);
        });

        btnCollector.on("end", async () => {
          if (!response) {
            return;
          }
          const giveaway = giveaways.get(response.id);
          if (!giveaway) return;

          const participants = [...giveaway.users];

          const shuffled = shuffle(participants);

          let idx = 0;
          const results: string[] = [];
          for (const reward of giveaway.rewards) {
            const winners = shuffled.slice(idx, idx + reward.amount);
            if (winners.length === 0) {
              results.push(`${reward.reward} nikt`);
            } else {
              results.push(
                `${reward.reward} ${winners.map((id) => `<@${id}>`).join(", ")}`,
              );
            }
            idx += reward.amount;
          }

          await response.edit({
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                ButtonBuilder.from(row.components[0] as ButtonBuilder).setDisabled(
                  true,
                ),
                ButtonBuilder.from(row.components[1] as ButtonBuilder).setDisabled(
                  true,
                ),
              ),
            ],
          });

          await response.reply({
            content: `Wyniki giveaway:\n${results.join("\n")}`,
            allowedMentions: { users: giveaway.users },
          });
          giveaways.delete(response.id);
        });
      }),
  );
