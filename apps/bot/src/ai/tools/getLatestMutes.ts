import { formatDuration, intervalToDuration, isAfter } from "date-fns";
import * as v from "valibot";
import { SnowflakeSchema } from "./definitions/snowflake";
import type { Creator, Tool } from "./util/tool";

const getLatestMutesSchema = v.object({
  userId: SnowflakeSchema,
});

const createGetLatestMutes: Creator<typeof getLatestMutesSchema> = (
  { prisma },
  { guild },
) => {
  return async function getLatestMutes({
    userId,
  }: v.InferInput<typeof getLatestMutesSchema>) {
    const mutes = await prisma.mute.findMany({
      where: { guildId: guild.id, userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    console.log(mutes);

    const now = new Date();

    return mutes.map((mute) => ({
      id: mute.id,
      mutedBy: mute.moderatorId,
      reason: mute.reason,
      duration: formatDuration(
        intervalToDuration({ start: mute.createdAt, end: mute.endsAt }),
      ),
      ...(isAfter(now, mute.endsAt)
        ? {
            timeSinceEnd: formatDuration(
              intervalToDuration({ start: mute.endsAt, end: now }),
            ),
          }
        : {}),
    }));
  };
};

export default {
  schema: getLatestMutesSchema,
  creator: createGetLatestMutes,
  name: "getLatestMutes",
  description: "Retrieve last 5 mutes of given member",
} as Tool<typeof getLatestMutesSchema>;
