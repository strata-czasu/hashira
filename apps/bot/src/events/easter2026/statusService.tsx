// somehow required for tests 🙄
/** @jsxImportSource @hashira/jsx */
import type {
  Easter2026Stage,
  Easter2026TeamConfig,
  PrismaTransaction,
  Team,
} from "@hashira/db";
import {
  Bold,
  Br,
  Container,
  H1,
  type JSXNode,
  MediaGallery,
  MediaGalleryItem,
  render,
  TextDisplay,
} from "@hashira/jsx";
import {
  bold,
  type Client,
  RESTJSONErrorCodes,
  roleMention,
  userMention,
} from "discord.js";
import { isNil } from "es-toolkit";
import { discordTry } from "../../util/discordTry";
import { getTeamPointsByUser, type UserPoints } from "./pointsService";

export type TeamWithFullConfig = Team & {
  easter2026TeamConfig: Easter2026TeamConfig & {
    stages: Easter2026Stage[];
  };
  _count: { members: number };
};

export type MilestoneInfo = {
  current: Easter2026Stage | null;
  next: Easter2026Stage | null;
};

export const formatMilestoneProgress = (
  totalPoints: number,
  current: Easter2026Stage | null,
  next: Easter2026Stage | null,
): string => {
  const neededPoints = next?.neededPoints ?? current?.neededPoints;

  if (isNil(neededPoints)) {
    return "Nie znaleziono progu!";
  }

  const progress = (totalPoints / neededPoints) * 100;
  const ending = Number.isNaN(progress) ? "" : ` (${progress.toFixed(1)}%)`;

  return `${totalPoints}/${bold(neededPoints.toString())} wiadomości${ending}`;
};

export const getMilestones = (stages: Easter2026Stage[]): MilestoneInfo => {
  const sorted = [...stages].sort((a, b) => a.neededPoints - b.neededPoints);

  const current = sorted.filter((s) => s.completedAt !== null).at(-1) ?? null;

  const next = sorted.find((s) => s.completedAt === null) ?? null;

  return { current, next };
};

export const buildTeamEmbed = (
  team: TeamWithFullConfig,
  totalPoints: number,
  topUsers: UserPoints[],
): JSXNode => {
  const config = team.easter2026TeamConfig;
  const { current, next } = getMilestones(config.stages);

  const top10 = topUsers.slice(0, 10);

  return (
    <Container accentColor={config.color}>
      <TextDisplay>
        <H1>Drużyna: {team.name}</H1>
        <Br />
        <Bold>Postęp drużyny:</Bold> <Br />
        {formatMilestoneProgress(totalPoints, current, next)}
        <Br />
        {config.captainUserId ? (
          <>
            <Bold>Kapitan:</Bold> {userMention(config.captainUserId)}
          </>
        ) : (
          ""
        )}
        <Br />
        {top10.length > 0 ? (
          <>
            <Bold>Top 10 najbardziej aktywnych członków:</Bold>
            <Br />
            {top10
              .map(
                (entry, index) =>
                  `${index + 1}. ${userMention(entry.userId)}: ${entry.totalPoints} punktów`,
              )
              .join("\n")}
          </>
        ) : (
          ""
        )}
      </TextDisplay>
      {current?.linkedImageUrl ? (
        <MediaGallery>
          <MediaGalleryItem url={current.linkedImageUrl} />
        </MediaGallery>
      ) : null}
    </Container>
  );
};

export const checkMilestoneThreshold = (
  totalPoints: number,
  stages: Easter2026Stage[],
): Easter2026Stage | null => {
  const { next } = getMilestones(stages);
  if (next && next.neededPoints <= totalPoints) {
    return next;
  }
  return null;
};

export const updateTeamStatusMessage = async (
  client: Client,
  prisma: PrismaTransaction,
  team: TeamWithFullConfig,
  dailyCap: number,
  eventStart: Date,
  eventEnd: Date,
  disabledChannelIds: string[],
  bonusChannels: { channelId: string; date: Date; multiplier: number }[],
): Promise<void> => {
  const config = team.easter2026TeamConfig;
  const channel = client.channels.cache.get(config.statusChannelId);
  if (!channel || !channel.isSendable()) return;

  const topUsers = await getTeamPointsByUser(
    prisma,
    team.id,
    eventStart,
    eventEnd,
    dailyCap,
    disabledChannelIds,
    bonusChannels,
  );

  const totalPoints = topUsers.reduce((sum, u) => sum + u.totalPoints, 0);

  const element = buildTeamEmbed(team, totalPoints, topUsers);
  const messageData = render(element);

  const passedStage = checkMilestoneThreshold(totalPoints, config.stages);
  if (passedStage) {
    await prisma.easter2026Stage.update({
      where: { id: passedStage.id },
      data: { completedAt: new Date() },
    });
  }

  const existingMessageId = config.statusLastMessageId;
  if (existingMessageId) {
    const existingMessage = await discordTry(
      () =>
        channel.messages.fetch({
          message: existingMessageId,
          cache: false,
        }),
      [RESTJSONErrorCodes.UnknownMessage],
      () => null,
    );

    if (existingMessage) {
      await existingMessage.edit(messageData);

      if (passedStage) {
        await channel.send({
          content: `Gratulacje! ${roleMention(config.roleId)}, osiągnęliście nowy próg!`,
        });
      }

      return;
    }
  }

  const sentMessage = await channel.send(messageData);
  await prisma.easter2026TeamConfig.update({
    where: { id: config.id },
    data: { statusLastMessageId: sentMessage.id },
  });

  if (passedStage) {
    await channel.send({
      content: `Gratulacje! ${roleMention(config.roleId)}, osiągnęliście nowy próg!`,
    });
  }
};
