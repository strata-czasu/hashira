import type { ExtractContext } from "@hashira/core";
import type {
  ExtendedPrismaClient,
  Giveaway,
  GiveawayParticipant,
  GiveawayReward,
  GiveawayWinner,
} from "@hashira/db";
import {
  ActionRowBuilder,
  type APIContainerComponent,
  type Attachment,
  type AutocompleteInteraction,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  type Message,
  MessageFlags,
  messageLink,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";
import { shuffle } from "es-toolkit";
import sharp from "sharp";
import type { base } from "../base";

enum GiveawayBannerRatio {
  None = 0, // No Banner
  Auto = 1,
  Landscape = 2, // 3:1
  Portrait = 3, // 2:3
}

function createGiveawayButtonRow(disabled: boolean) {
  const joinButton = new ButtonBuilder()
    .setCustomId("giveaway-option:join")
    .setLabel("Dołącz")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(disabled);

  const listButton = new ButtonBuilder()
    .setCustomId("giveaway-option:list")
    .setLabel("Lista uczestników")
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(joinButton, listButton);
}

function createLeaveButtonRow() {
  const leaveButton = new ButtonBuilder()
    .setCustomId("leave_giveaway")
    .setLabel("Wyjdź")
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(leaveButton);
}

export { GiveawayBannerRatio, createGiveawayButtonRow, createLeaveButtonRow };

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
  "image/webp",
  "image/gif",
  "image/avif",
];
const bannedMimeTypesFromFormatting = ["image/avif"];

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
    !banner.height ||
    (ratio !== GiveawayBannerRatio.Auto &&
      bannedMimeTypesFromFormatting.includes(banner.contentType))
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
        return 3 / 1;

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

  // Gets animation loop count from metadata, defaults to 0 (infinite)
  const metadata = await sharp(buffer, { animated: true }).metadata();
  const loop = metadata.loop ?? 0;

  const formatted = await sharp(buffer, { animated: true })
    .resize(targetWidth, targetHeight, {
      fit: "cover",
      position: "centre",
    })
    .toFormat("webp", { loop })
    .toBuffer();

  return [formatted, "webp"];
}

export function giveawayFooter(giveaway: Giveaway) {
  return `\n-# Id: ${giveaway.id} ${messageLink(giveaway.channelId, giveaway.messageId, giveaway.guildId)}`;
}

export function getStaticBanner(title: string) {
  if (title.toLowerCase().includes("ruletka")) return "https://i.imgur.com/0O3wOcx.png";

  return "https://i.imgur.com/iov10WG.png";
}

export const autocompleteGiveawayId = async ({
  prisma,
  itx,
}: {
  prisma: ExtractContext<typeof base>["prisma"];
  itx: AutocompleteInteraction<"cached">;
}) => {
  const focused = Number(itx.options.getFocused());
  if (Number.isNaN(focused)) return;

  const results = await prisma.giveaway.findMany({
    where: {
      id: { gte: focused },
      guildId: itx.guildId,
      authorId: itx.user.id,
    },
    orderBy: { endAt: "desc" },
    take: 5,
  });

  return itx.respond(
    results.map(({ id }) => ({
      value: id,
      name: `${id}`,
    })),
  );
};

export async function updateGiveaway(
  message: Message<boolean>,
  giveaway: Giveaway,
  prisma: ExtendedPrismaClient,
) {
  if (giveaway && message.components[0]) {
    const participants: GiveawayParticipant[] =
      await prisma.giveawayParticipant.findMany({
        where: { giveawayId: giveaway.id, isRemoved: false },
      });

    const container = new ContainerBuilder(
      message.components[0].toJSON() as APIContainerComponent,
    );

    const footerIndex = container.components.findIndex(
      (c) => c.data?.id === 1 && c.data?.type === ComponentType.TextDisplay,
    );

    if (footerIndex === -1) return;

    container.components[footerIndex] = new TextDisplayBuilder().setContent(
      `-# Uczestnicy: ${participants.length} | Łącznie nagród: ${giveaway.totalRewards} | Id: ${giveaway.id}`,
    );

    await message.edit({ components: [container] });
  }
}

/**
 * Selects winners for all rewards in a giveaway and saves them to the database.
 * @returns Array of winning user data with their assigned rewards
 */
export async function selectAndSaveWinners(
  giveawayId: number,
  rewards: GiveawayReward[],
  participants: GiveawayParticipant[],
  prisma: ExtendedPrismaClient,
): Promise<Omit<GiveawayWinner, "id">[]> {
  // Shuffle participants
  const shuffledIds = shuffle(participants.map((p) => p.userId));

  // Assign rewards
  let idx = 0;
  const winningUsers: Omit<GiveawayWinner, "id">[] = [];

  for (const { amount, id: rewardId } of rewards) {
    // biome-ignore lint/suspicious/noAssignInExpressions: this is intended as a compact way to slice
    const slice = shuffledIds.slice(idx, (idx += amount));
    if (slice.length > 0) {
      winningUsers.push(
        ...slice.map((userId) => ({
          giveawayId: giveawayId,
          userId: userId,
          rewardId: rewardId,
        })),
      );
    }
  }

  // Saving winners in db
  if (winningUsers.length > 0) {
    await prisma.giveawayWinner.createMany({
      data: winningUsers,
      skipDuplicates: true,
    });
  }

  return winningUsers;
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

  const winningUsers = await selectAndSaveWinners(
    giveaway.id,
    rewards,
    participants,
    prisma,
  );

  const results = rewards.map(({ reward, id: rewardId }) => {
    const rewardWinners = winningUsers.filter((w) => w.rewardId === rewardId);
    const mention =
      rewardWinners.length === 0
        ? "nikt"
        : rewardWinners.map((w) => `<@${w.userId}>`).join(" ");
    return `> ${reward} ${mention}`;
  });

  const resultContainer = new ContainerBuilder()
    .setAccentColor(0x00ff99)
    .addTextDisplayComponents((td) => td.setContent("# :tada: Wyniki giveaway"))
    .addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Large))
    .addTextDisplayComponents((td) => td.setContent(results.join("\n")));

  await message.reply({
    components: [resultContainer],
    allowedMentions: { users: winningUsers.map((p) => p.userId) },
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
    components: createGiveawayButtonRow(true).components,
  });

  container.components[actionRowIndex] = newRow;

  await message.edit({
    components: [container],
  });
}
