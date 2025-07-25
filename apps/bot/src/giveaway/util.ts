import type {
  ExtendedPrismaClient,
  Giveaway,
  GiveawayParticipant,
  GiveawayReward,
  GiveawayWinner,
} from "@hashira/db";
import {
  type APIContainerComponent,
  ActionRowBuilder,
  type Attachment,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  type Message,
  MessageFlags,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";
import { shuffle } from "es-toolkit";
import sharp from "sharp";

enum GiveawayBannerRatio {
  None = 0, // No Banner
  Auto = 1,
  Landscape = 2, // 4:1
  Portrait = 3, // 2:3
}

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

export { GiveawayBannerRatio, giveawayButtonRow, leaveButtonRow };

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

const allowedMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/apng",
  "image/webp",
  "image/gif",
  "image/avif",
];

export function getExtension(mimeType: string | null) {
  if (!mimeType) return "webp";
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";

    default:
      return mimeType.split("/")[1] ?? "webp";
  }
}

export async function formatBanner(
  banner: Attachment,
  ratio: GiveawayBannerRatio,
): Promise<[Buffer | null, string]> {
  if (
    !banner.contentType ||
    !allowedMimeTypes.includes(banner.contentType) ||
    !banner.width ||
    !banner.height
  )
    return [null, ""];

  const res = await fetch(banner.url);
  const buffer = Buffer.from(await res.arrayBuffer());

  if (ratio === GiveawayBannerRatio.Auto) {
    const ext = getExtension(banner.contentType);
    return [buffer, ext];
  }

  const targetAspect = (() => {
    switch (ratio) {
      case GiveawayBannerRatio.Landscape:
        return 4 / 1;

      case GiveawayBannerRatio.Portrait:
        return 2 / 3;

      default:
        return null;
    }
  })();

  if (!targetAspect) return [null, ""];

  const origAspect = banner.width / banner.height;
  const maxSide = Math.max(banner.width, banner.height);

  let targetWidth: number;
  let targetHeight: number;

  if (origAspect >= targetAspect) {
    targetHeight = maxSide;
    targetWidth = Math.round(maxSide * targetAspect);
  } else {
    targetWidth = maxSide;
    targetHeight = Math.round(maxSide / targetAspect);
  }

  const formatted = await sharp(buffer, { animated: true })
    .resize(targetWidth, targetHeight, {
      fit: "cover",
      position: "centre",
    })
    .toFormat("webp")
    .toBuffer();

  return [formatted, "webp"];
}

export function getStaticBanner(title: string) {
  if (title.toLowerCase().includes("ruletka")) return "https://i.imgur.com/0O3wOcx.png";

  return "https://i.imgur.com/iov10WG.png";
}

export async function updateGiveaway(
  i: ButtonInteraction,
  giveaway: Giveaway,
  prisma: ExtendedPrismaClient,
) {
  if (giveaway && i.message.components[0]) {
    const participants: GiveawayParticipant[] =
      await prisma.giveawayParticipant.findMany({
        where: { giveawayId: giveaway.id, isRemoved: false },
      });

    const container = new ContainerBuilder(
      i.message.components[0].toJSON() as APIContainerComponent,
    );

    const footerIndex = container.components.findIndex(
      (c) => c.data?.id === 1 && c.data?.type === ComponentType.TextDisplay,
    );

    if (footerIndex === -1) return;

    container.components[footerIndex] = new TextDisplayBuilder().setContent(
      `-# Uczestnicy: ${participants.length} | Łącznie nagród: ${giveaway.totalRewards}`,
    );

    await i.message.edit({ components: [container] });
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

  if (!giveaway || !message.components[0]) return;

  const [rewards, participants] = await prisma.$transaction([
    prisma.giveawayReward.findMany({
      where: { giveawayId: giveaway.id },
    }),
    prisma.giveawayParticipant.findMany({
      where: { giveawayId: giveaway.id, isRemoved: false },
    }),
  ]);

  // Shuffle participants
  const shuffledIds = shuffle(participants.map((p) => p.userId));

  // Assign rewards
  let idx = 0;
  const winningUsers: Omit<GiveawayWinner, "id">[] = [];
  const results = rewards.map(({ reward, amount, id: rewardId }) => {
    // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
    const slice = shuffledIds.slice(idx, (idx += amount));
    if (slice.length > 0) {
      winningUsers.push(
        ...slice.map((userId) => ({
          giveawayId: giveaway.id,
          userId: userId,
          rewardId: rewardId,
        })),
      );
    }
    const mention =
      slice.length === 0 ? "nikt" : slice.map((id) => `<@${id}>`).join(" ");
    return `> ${reward} ${mention}`;
  });

  // Saving winners in db
  if (winningUsers.length > 0) {
    await prisma.giveawayWinner.createMany({
      data: winningUsers,
      skipDuplicates: true,
    });
  }

  const resultContainer = new ContainerBuilder()
    .setAccentColor(0x00ff99)
    .addTextDisplayComponents((td) => td.setContent("# :tada: Wyniki giveaway"))
    .addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Large))
    .addTextDisplayComponents((td) => td.setContent(results.join("\n")));

  await message.reply({
    components: [resultContainer],
    allowedMentions: { users: participants.map((p) => p.userId) },
    flags: MessageFlags.IsComponentsV2,
  });

  // Disable giveaway buttons
  const container = new ContainerBuilder(
    message.components[0].toJSON() as APIContainerComponent,
  );

  const actionRowIndex = container.components.findIndex(
    (c) => c.data?.id === 2 && c.data?.type === ComponentType.ActionRow,
  );

  if (actionRowIndex === -1) return;

  const newRow = new ActionRowBuilder<ButtonBuilder>({
    ...container.components[actionRowIndex]?.data,
    components: [
      ButtonBuilder.from(giveawayButtonRow.components[0] as ButtonBuilder).setDisabled(
        true,
      ),
      ButtonBuilder.from(giveawayButtonRow.components[1] as ButtonBuilder).setDisabled(
        true,
      ),
    ],
  });

  container.components[actionRowIndex] = newRow;

  await message.edit({
    components: [container],
  });
}
