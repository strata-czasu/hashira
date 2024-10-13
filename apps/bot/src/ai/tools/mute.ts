import * as v from "valibot";
import { universalAddMute } from "../../moderation/mutes";
import { SnowflakeSchema } from "./definitions/snowflake";
import type { Creator, Tool } from "./util/tool";

const createMuteSchema = v.object({
  userId: SnowflakeSchema,
  duration: v.pipe(
    v.string(),
    v.description("Duration of the mute. Example: 1h, 1d, 1m, 1s"),
  ),
  reason: v.string(),
});

const createMute: Creator<typeof createMuteSchema> = (
  { prisma, messageQueue, moderationLog: log },
  { guild, invokedBy: moderator, reply },
) => {
  async function mute({
    userId,
    duration,
    reason,
  }: v.InferInput<typeof createMuteSchema>) {
    await universalAddMute({
      prisma,
      messageQueue,
      log,
      userId,
      guild,
      moderator,
      duration,
      reason,
      reply,
    });
  }

  return mute;
};

export default {
  schema: createMuteSchema,
  creator: createMute,
  name: "mute",
  description: "Mute a user.",
} as Tool<typeof createMuteSchema>;
