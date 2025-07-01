import type {
  ExtendedPrismaClient,
  Giveaway,
  GiveawayParticipant,
  GiveawayReward,
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

  const rewards = await prisma.giveawayReward.findMany({
    where: { giveawayId: giveaway.id },
  });
  const participants = await prisma.giveawayParticipant.findMany({
    where: { giveawayId: giveaway.id, isRemoved: false },
  });

  // Shuffle participants
  const shuffled = shuffle(participants.map((p) => p.userId));

  // Assign rewards
  let idx = 0;
  const results: string[] = [];
  for (const reward of rewards) {
    const winners = shuffled.slice(idx, idx + reward.amount);
    if (winners.length === 0) {
      results.push(`${reward.reward} nikt`);
    } else {
      results.push(`${reward.reward} ${winners.map((id) => `<@${id}>`).join(", ")}`);
    }
    idx += reward.amount;
  }

  // Reply with results
  await message.reply({
    content: `:tada: Wyniki giveaway:\n${results.join("\n")}`,
    allowedMentions: { users: participants.map((p) => p.userId) },
  });

  // Delete giveaway and FK's
  // await prisma.$transaction([
  //   prisma.giveawayParticipant.deleteMany({ where: { giveawayId: giveaway.id } }),
  //   prisma.giveawayReward.deleteMany({ where: { giveawayId: giveaway.id } }),
  //   prisma.giveaway.delete({ where: { id: giveaway.id } }),
  // ]);
}
