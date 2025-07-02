import type {
  ExtendedPrismaClient,
  Giveaway,
  GiveawayParticipant,
  GiveawayReward,
  GiveawayWinner,
} from "@hashira/db";
import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  type Message,
} from "discord.js";
import { shuffle } from "es-toolkit";

const joinButton = new ButtonBuilder()
  .setCustomId("giveaway-option:join")
  .setLabel("Dołącz")
  .setStyle(ButtonStyle.Primary);

const listButton = new ButtonBuilder()
  .setCustomId("giveaway-option:list")
  .setLabel("Lista uczestników")
  .setStyle(ButtonStyle.Secondary);

const giveawayButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
  joinButton,
  listButton,
);

const leaveButton = new ButtonBuilder()
  .setCustomId("leave_giveaway")
  .setLabel("Wyjdź")
  .setStyle(ButtonStyle.Danger);

const leaveButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(leaveButton);

export { giveawayButtonRow, leaveButtonRow };

export function parseRewards(input: string): GiveawayReward[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => {
      const match = item.match(/^(\d+)x\s*(.+)$/i);
      if (match) {
        const [, num, reward] = match;
        if (reward)
          return { id: 0, giveawayId: 0, amount: Number(num), reward: reward.trim() };
      }
      return { id: 0, giveawayId: 0, amount: 1, reward: item };
    });
}

export async function updateGiveaway(
  i: ButtonInteraction,
  giveaway: Giveaway,
  prisma: ExtendedPrismaClient,
) {
  if (giveaway && i.message.embeds[0]) {
    const participants: GiveawayParticipant[] =
      await prisma.giveawayParticipant.findMany({
        where: { giveawayId: giveaway.id, isRemoved: false },
      });
    const updatedEmbed = EmbedBuilder.from(i.message.embeds[0]).setFooter({
      text: `Uczestnicy: ${participants.length} | Łącznie nagród: ${giveaway.totalRewards}`,
    });
    await i.message.edit({ embeds: [updatedEmbed] });
  }
}

export async function endGiveaway(
  message: Message<boolean>,
  prisma: ExtendedPrismaClient,
) {
  if (!message.guildId) return;

  const giveaway = await prisma.giveaway.findFirst({
    where: { messageId: message.id, guildId: message.guildId },
  });

  if (!giveaway) return;

  // Disable giveaway buttons
  await message.edit({
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ButtonBuilder.from(
          giveawayButtonRow.components[0] as ButtonBuilder,
        ).setDisabled(true),
        ButtonBuilder.from(
          giveawayButtonRow.components[1] as ButtonBuilder,
        ).setDisabled(true),
      ),
    ],
  });

  const [rewards, participants, winners] = await prisma.$transaction([
    prisma.giveawayReward.findMany({
      where: { giveawayId: giveaway.id },
    }),
    prisma.giveawayParticipant.findMany({
      where: { giveawayId: giveaway.id, isRemoved: false },
    }),
    prisma.giveawayWinner.findMany({
      where: { giveawayId: giveaway.id },
    }),
  ]);

  // To make sure results aren't sent twice (can be invoked by pressing giveaway button after end)
  if (winners.length !== 0) return;

  // Shuffle participants
  const shuffledIds = shuffle(participants.map((p) => p.userId));

  // Assign rewards
  let idx = 0;
  const winningUsers: Omit<GiveawayWinner, "id">[] = [];
  const results = rewards.map(({ reward, amount }) => {
    // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
    const slice = shuffledIds.slice(idx, (idx += amount));
    if (slice.length > 0) {
      winningUsers.push(
        ...slice.map((userId) => ({
          giveawayId: giveaway.id,
          userId: userId,
          rewardId: rewards.find((r) => r.reward === reward)?.id ?? 0,
        })),
      );
    }
    const mention =
      slice.length === 0 ? "nikt" : slice.map((id) => `<@${id}>`).join(", ");
    return `${reward} ${mention}`;
  });

  // Saving winners in db
  if (winningUsers.length > 0) {
    await prisma.giveawayWinner.createMany({
      data: winningUsers,
      skipDuplicates: true,
    });
  }

  await message.reply({
    content: `:tada: Wyniki giveaway:\n${results.join("\n")}`,
    allowedMentions: { users: participants.map((p) => p.userId) },
  });
}
