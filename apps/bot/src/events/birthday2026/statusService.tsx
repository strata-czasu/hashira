/** @jsxImportSource @hashira/jsx */
import type { ExtendedPrismaClient, PrismaTransaction } from "@hashira/db";
import { isUniqueConstraintError } from "@hashira/db";
import {
  Bold,
  Br,
  Container,
  H1,
  H2,
  MediaGallery,
  MediaGalleryItem,
  render,
  Separator,
  TextDisplay,
} from "@hashira/jsx";
import { type Client, RESTJSONErrorCodes, roleMention, userMention } from "discord.js";
import { discordTry } from "../../util/discordTry";

const milestoneNames = [
  "Początek",
  "Pierwszy wzrost",
  "Drugi wzrost",
  "Trzeci wzrost",
  "Forma finałowa",
];

const isPositiveInteger = (value: number) => Number.isSafeInteger(value) && value > 0;

export const configureBirthday2026Milestones = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
  thresholds: number[],
) => {
  if (
    thresholds.length !== 4 ||
    thresholds.some((threshold) => !isPositiveInteger(threshold)) ||
    thresholds.some(
      (threshold, index) =>
        index > 0 && threshold <= (thresholds[index - 1] ?? threshold),
    )
  ) {
    return { ok: false, reason: "invalid_thresholds" } as const;
  }

  return prisma.$transaction(async (tx) => {
    const config = await tx.birthday2026Config.findUnique({
      where: { guildId },
      include: { milestones: { orderBy: { position: "asc" } } },
    });
    if (!config) return { ok: false, reason: "config_not_found" } as const;
    const values = [0, ...thresholds];
    if (config.milestones.length > 0) {
      return config.milestones.every(
        (milestone, index) => milestone.threshold === values[index],
      )
        ? ({ ok: true, milestones: config.milestones } as const)
        : ({ ok: false, reason: "milestones_already_configured" } as const);
    }
    if (config.enabled) return { ok: false, reason: "event_enabled" } as const;

    await tx.birthday2026Milestone.createMany({
      data: values.map((threshold, position) => ({
        configId: config.id,
        position,
        threshold,
        name: milestoneNames[position] ?? "Etap",
      })),
    });
    return {
      ok: true,
      milestones: await tx.birthday2026Milestone.findMany({
        where: { configId: config.id },
        orderBy: { position: "asc" },
      }),
    } as const;
  });
};

export const configureBirthday2026Persona = async (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    teamConfigId: number;
    title: string;
    fallbackEmoji: string;
    configuredByUserId: string;
    consentedAt: Date;
  },
) => {
  const title = input.title.trim();
  const fallbackEmoji = input.fallbackEmoji.trim();
  if (!title || !fallbackEmoji) {
    return { ok: false, reason: "invalid_persona" } as const;
  }
  const team = await prisma.birthday2026TeamConfig.findFirst({
    where: { id: input.teamConfigId, config: { guildId: input.guildId } },
    include: { identity: true },
  });
  if (!team) return { ok: false, reason: "team_not_found" } as const;
  if (!team.identity) return { ok: false, reason: "tucznik_not_configured" } as const;

  const persona = await prisma.birthday2026TeamPersona.upsert({
    where: { teamConfigId: team.id },
    create: {
      teamConfigId: team.id,
      configId: team.configId,
      tucznikUserId: team.identity.tucznikUserId,
      title,
      fallbackEmoji,
      consentedAt: input.consentedAt,
      configuredByUserId: input.configuredByUserId,
    },
    update: {
      tucznikUserId: team.identity.tucznikUserId,
      title,
      fallbackEmoji,
      consentedAt: input.consentedAt,
      configuredByUserId: input.configuredByUserId,
    },
  });
  return { ok: true, persona } as const;
};

export const configureBirthday2026Artwork = async (
  prisma: ExtendedPrismaClient,
  input: {
    guildId: string;
    teamConfigId: number;
    milestonePosition: number;
    imageUrl: string;
  },
) => {
  let imageUrl: URL;
  try {
    imageUrl = new URL(input.imageUrl);
  } catch {
    return { ok: false, reason: "invalid_url" } as const;
  }
  if (imageUrl.protocol !== "https:") {
    return { ok: false, reason: "invalid_url" } as const;
  }

  const team = await prisma.birthday2026TeamConfig.findFirst({
    where: { id: input.teamConfigId, config: { guildId: input.guildId } },
    include: {
      persona: true,
      config: {
        select: {
          milestones: { where: { position: input.milestonePosition } },
        },
      },
    },
  });
  if (!team) return { ok: false, reason: "team_not_found" } as const;
  if (!team.persona) return { ok: false, reason: "persona_not_configured" } as const;
  const milestone = team.config.milestones.at(0);
  if (!milestone) return { ok: false, reason: "milestone_not_found" } as const;

  const artwork = await prisma.birthday2026TeamArtwork.upsert({
    where: {
      teamConfigId_milestoneId: {
        teamConfigId: team.id,
        milestoneId: milestone.id,
      },
    },
    create: {
      teamConfigId: team.id,
      milestoneId: milestone.id,
      configId: team.configId,
      imageUrl: imageUrl.toString(),
    },
    update: { imageUrl: imageUrl.toString() },
  });
  return { ok: true, artwork } as const;
};

const getBirthday2026TeamStatus = (prisma: PrismaTransaction, teamConfigId: number) =>
  prisma.birthday2026TeamConfig.findUnique({
    where: { id: teamConfigId },
    include: {
      team: true,
      identity: true,
      persona: true,
      wallet: true,
      statusMessage: true,
      artworks: { include: { milestone: true } },
      milestones: true,
      config: {
        select: {
          economy: { include: { currency: true } },
          milestones: { orderBy: { position: "asc" } },
        },
      },
    },
  });

type Birthday2026TeamStatus = NonNullable<
  Awaited<ReturnType<typeof getBirthday2026TeamStatus>>
>;

export const buildBirthday2026TeamStatusView = (
  team: Birthday2026TeamStatus,
  contributorCount: number,
) => {
  if (!team.identity || !team.persona || !team.wallet || !team.config.economy) {
    throw new Error("Birthday 2026 team status is not configured");
  }
  const { identity, persona, wallet } = team;
  const economy = team.config.economy;
  const currentMilestone = team.config.milestones
    .filter((milestone) => milestone.threshold <= wallet.permanentWeight)
    .at(-1);
  const nextMilestone = team.config.milestones.find(
    (milestone) => milestone.threshold > wallet.permanentWeight,
  );
  const artwork = team.artworks
    .filter((entry) => entry.milestone.threshold <= wallet.permanentWeight)
    .sort((a, b) => b.milestone.threshold - a.milestone.threshold)
    .at(0);

  return (
    <Container accentColor={team.color}>
      <TextDisplay>
        <H1>
          {persona.fallbackEmoji} {persona.title}
        </H1>
        <Br />
        <Bold>Drużyna:</Bold> {roleMention(team.roleId)}
        <Br />
        <Bold>Tucznik:</Bold> {userMention(identity.tucznikUserId)}
        <Br />
        <Bold>Kapitan:</Bold> {userMention(identity.captainUserId)}
      </TextDisplay>
      <Separator divider />
      <TextDisplay>
        <H2>Postęp</H2>
        <Br />
        <Bold>Stała waga:</Bold> {wallet.permanentWeight.toLocaleString("pl-PL")}
        <Br />
        <Bold>W korycie:</Bold> {wallet.balance.toLocaleString("pl-PL")}{" "}
        {economy.currency.symbol}
        <Br />
        <Bold>Osoby karmiące:</Bold> {contributorCount.toLocaleString("pl-PL")}
        <Br />
        <Bold>Etap:</Bold> {currentMilestone?.name ?? "Początek"}
        <Br />
        {nextMilestone ? (
          <>
            <Bold>Następny próg:</Bold> {wallet.permanentWeight}/
            {nextMilestone.threshold} — {nextMilestone.name}
          </>
        ) : (
          "Osiągnięto formę finałową."
        )}
      </TextDisplay>
      {artwork ? (
        <MediaGallery>
          <MediaGalleryItem url={artwork.imageUrl} />
        </MediaGallery>
      ) : null}
    </Container>
  );
};

export const reconcileBirthday2026StatusMessage = async (
  client: Client,
  prisma: ExtendedPrismaClient,
  teamConfigId: number,
  requestedChannelId?: string,
) => {
  const team = await getBirthday2026TeamStatus(prisma, teamConfigId);
  if (!team) return { ok: false, reason: "team_not_found" } as const;
  if (!team.identity || !team.persona || !team.wallet || !team.config.economy) {
    return { ok: false, reason: "status_not_ready" } as const;
  }
  const channelId = requestedChannelId ?? team.statusMessage?.channelId;
  if (!channelId) return { ok: false, reason: "status_not_configured" } as const;
  const channel = await client.channels.fetch(channelId);
  if (!channel?.isSendable()) {
    return { ok: false, reason: "channel_not_sendable" } as const;
  }

  const newlyCompleted = [];
  for (const milestone of team.config.milestones) {
    if (
      milestone.position === 0 ||
      milestone.threshold > team.wallet.permanentWeight ||
      team.milestones.some((entry) => entry.milestoneId === milestone.id)
    ) {
      continue;
    }
    try {
      await prisma.birthday2026TeamMilestone.create({
        data: {
          teamConfigId: team.id,
          milestoneId: milestone.id,
          configId: team.configId,
        },
      });
      newlyCompleted.push(milestone);
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }
  }

  const contributorCount = (
    await prisma.birthday2026FeedBatch.findMany({
      where: { walletId: team.wallet.id },
      distinct: ["userId"],
      select: { userId: true },
    })
  ).length;
  const messageData = render(buildBirthday2026TeamStatusView(team, contributorCount));
  const statusMessage = team.statusMessage;
  const existingMessage =
    statusMessage?.channelId === channelId
      ? await discordTry(
          () =>
            channel.messages.fetch({
              message: statusMessage.messageId,
              cache: false,
            }),
          [RESTJSONErrorCodes.UnknownMessage],
          () => null,
        )
      : null;
  const message = existingMessage
    ? await existingMessage.edit(messageData)
    : await channel.send(messageData);
  await prisma.birthday2026StatusMessage.upsert({
    where: { teamConfigId: team.id },
    create: {
      teamConfigId: team.id,
      configId: team.configId,
      channelId,
      messageId: message.id,
    },
    update: { channelId, messageId: message.id },
  });

  for (const milestone of newlyCompleted) {
    await channel.send({
      content: `Gratulacje! ${roleMention(team.roleId)} osiągnęliście etap **${milestone.name}**!`,
    });
  }
  return {
    ok: true,
    completedMilestones: newlyCompleted.length,
    recreated: !existingMessage,
  } as const;
};
