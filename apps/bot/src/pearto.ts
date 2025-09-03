import { TZDate } from "@date-fns/tz";
import { Hashira } from "@hashira/core";
import { type Duration, addMinutes, startOfDay } from "date-fns";
import { base } from "./base";
import { STRATA_CZASU } from "./specializedConstants";

const channelId = "683025889658929231";
const guildId = STRATA_CZASU.GUILD_ID;
const resEmoji = "<a:peartotanczy:1410749447608205322>";

class Cooldown {
  private lastReset: Date;
  private readonly duration: Duration;

  constructor(duration: Duration) {
    this.duration = duration;
    this.lastReset = new Date(0);
  }

  ended(now: Date = new Date()): boolean {
    const endTime = addMinutes(this.lastReset, this.duration.minutes ?? 0);
    if (now >= endTime) {
      this.lastReset = now;
      return true;
    }
    return false;
  }
}

export const pearto = new Hashira({ name: "pearto" })
  .const("peartoCooldown", new Cooldown({ minutes: 1 }))
  .use(base)
  .handle("messageCreate", async ({ prisma, peartoCooldown }, message) => {
    if (
      message.channelId !== channelId ||
      message.author.bot ||
      !message.inGuild() ||
      message.content.trim() !== "🍐" ||
      !peartoCooldown.ended(message.createdAt)
    )
      return;

    const localDate = new TZDate(message.createdAt, "Europe/Warsaw");
    const startOfDayLocal = startOfDay(localDate);
    const startOfDayUTC = new Date(startOfDayLocal.getTime());

    const todaysMessages = await prisma.userTextActivity.count({
      where: {
        channelId,
        guildId,
        timestamp: {
          gte: startOfDayUTC,
        },
      },
    });

    const threshold = [5000, 7000, 9000, 11000, 50000].filter(
      (n) => n > todaysMessages,
    )[0];

    if (!threshold) return;

    const fillValue = Math.floor((todaysMessages / threshold) * 20);

    message.reply(
      `${resEmoji} [${"█".repeat(fillValue)}${"░".repeat(20 - fillValue)}] ${todaysMessages}/${threshold} ${resEmoji}`,
    );
  });
