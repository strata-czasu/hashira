import { TZDate } from "@date-fns/tz";
import { type ExtractContext, Hashira } from "@hashira/core";
import { isValid, parse } from "date-fns";
import { PermissionFlagsBits, channelMention, userMention } from "discord.js";
import { base } from "./base";
import { TZ } from "./specializedConstants";
import { ensureUserExists } from "./util/ensureUsersExist";
import { errorFollowUp } from "./util/errorFollowUp";

const BIRTHDAY_HOUR = 10; // 10 AM Polish time
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

type BaseContext = ExtractContext<typeof base>;

const MONTH_NAMES = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
] as const;

const parseBirthdayDate = (
  dateString: string,
): { month: number; day: number; year?: number } | null => {
  // Try formats: DD-MM or DD-MM-YYYY
  const withYear = parse(dateString, "dd-MM-yyyy", new Date());
  if (isValid(withYear)) {
    return {
      month: withYear.getMonth() + 1,
      day: withYear.getDate(),
      year: withYear.getFullYear(),
    };
  }

  const withoutYear = parse(dateString, "dd-MM", new Date());
  if (isValid(withoutYear)) {
    return {
      month: withoutYear.getMonth() + 1,
      day: withoutYear.getDate(),
    };
  }

  return null;
};

const scheduleBirthdayMessages = async (
  prisma: BaseContext["prisma"],
  messageQueue: BaseContext["messageQueue"],
) => {
  const nowInPoland = new TZDate(new Date(), TZ);

  const currentMonth = nowInPoland.getMonth() + 1;
  const currentDay = nowInPoland.getDate();

  // Find all birthdays for today
  const todayBirthdays = await prisma.birthday.findMany({
    where: {
      month: currentMonth,
      day: currentDay,
    },
  });

  if (todayBirthdays.length === 0) {
    return;
  }

  // Get all guilds with birthday channels configured
  const guildsWithBirthdayChannel = await prisma.guildSettings.findMany({
    where: {
      birthdayChannelId: { not: null },
    },
  });

  // Schedule birthday messages for each combination
  for (const birthday of todayBirthdays) {
    for (const guildSettings of guildsWithBirthdayChannel) {
      // Calculate when to send the message (10 AM Polish time today)
      const sendTime = new TZDate(
        nowInPoland.getFullYear(),
        nowInPoland.getMonth(),
        nowInPoland.getDate(),
        BIRTHDAY_HOUR,
        0,
        0,
        0,
        TZ,
      );

      // If it's already past 10 AM today, skip (we don't send late birthday messages)
      if (sendTime < nowInPoland) {
        continue;
      }

      // Check if we already scheduled this birthday message
      const identifier = `birthday-${birthday.userId}-${guildSettings.guildId}-${currentMonth}-${currentDay}`;

      const existingTask = await prisma.task.findFirst({
        where: {
          identifier,
          status: "pending",
        },
      });

      if (existingTask) {
        continue; // Already scheduled
      }

      await messageQueue.push(
        "birthday",
        {
          userId: birthday.userId,
          guildId: guildSettings.guildId,
        },
        sendTime,
        identifier,
      );
    }
  }
};

export const birthday = new Hashira({ name: "birthday" })
  .use(base)
  .command("ustaw-urodziny", (command) =>
    command
      .setDescription("Ustaw swoją datę urodzin")
      .setDMPermission(false)
      .addString("data", (option) =>
        option
          .setDescription(
            "Data urodzin w formacie DD-MM (np. 15-03) lub DD-MM-YYYY (np. 15-03-1990)",
          )
          .setRequired(true),
      )
      .handle(async ({ prisma }, { data }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply({ flags: "Ephemeral" });

        await ensureUserExists(prisma, itx.user);

        const parsed = parseBirthdayDate(data);
        if (!parsed) {
          return errorFollowUp(
            itx,
            "Nieprawidłowy format daty. Użyj DD-MM (np. 15-03) lub DD-MM-YYYY (np. 15-03-1990)",
          );
        }

        // Validate month and day
        if (parsed.month < 1 || parsed.month > 12) {
          return errorFollowUp(itx, "Nieprawidłowy miesiąc. Podaj miesiąc od 1 do 12");
        }

        const daysInMonth = new Date(parsed.year || 2024, parsed.month, 0).getDate();
        if (parsed.day < 1 || parsed.day > daysInMonth) {
          return errorFollowUp(
            itx,
            `Nieprawidłowy dzień. W ${MONTH_NAMES[parsed.month - 1]} jest ${daysInMonth} dni`,
          );
        }

        await prisma.birthday.upsert({
          where: { userId: itx.user.id },
          create: {
            userId: itx.user.id,
            month: parsed.month,
            day: parsed.day,
            year: parsed.year ?? null,
          },
          update: {
            month: parsed.month,
            day: parsed.day,
            year: parsed.year ?? null,
          },
        });

        const yearInfo = parsed.year ? ` ${parsed.year}` : "";
        await itx.editReply(
          `✅ Zapisano Twoją datę urodzin: ${parsed.day} ${MONTH_NAMES[parsed.month - 1]}${yearInfo}`,
        );
      }),
  )
  .command("pokaz-urodziny", (command) =>
    command
      .setDescription("Wyświetl listę wszystkich urodzin")
      .setDMPermission(false)
      .handle(async ({ prisma }, _, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        const birthdays = await prisma.birthday.findMany({
          orderBy: [{ month: "asc" }, { day: "asc" }],
        });

        if (birthdays.length === 0) {
          await itx.editReply(
            "Nie znaleziono żadnych urodzin. Użyj `/ustaw-urodziny`, aby dodać swoje!",
          );
          return;
        }

        // Group by month
        const byMonth: Record<number, typeof birthdays> = {};
        for (const birthday of birthdays) {
          if (!byMonth[birthday.month]) {
            byMonth[birthday.month] = [];
          }
          const monthArray = byMonth[birthday.month];
          if (monthArray) {
            monthArray.push(birthday);
          }
        }

        // Format for each month
        const lines: string[] = [];
        for (let month = 1; month <= 12; month++) {
          const monthBirthdays = byMonth[month];
          if (!monthBirthdays || monthBirthdays.length === 0) continue;

          lines.push(`\n**${MONTH_NAMES[month - 1]}**`);
          for (const bday of monthBirthdays) {
            const yearInfo = bday.year ? ` (${bday.year})` : "";
            lines.push(`• ${bday.day} - ${userMention(bday.userId)}${yearInfo}`);
          }
        }

        const content = lines.join("\n");

        await itx.editReply(content);
      }),
  )
  .group("urodziny-admin", (group) =>
    group
      .setDescription("Komendy administracyjne do zarządzania urodzinami")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addCommand("ustaw-kanal", (command) =>
        command
          .setDescription("Ustaw kanał do wysyłania życzeń urodzinowych")
          .addChannel("kanal", (option) =>
            option
              .setDescription("Kanał na którym będą wysyłane życzenia")
              .setRequired(true),
          )
          .handle(async ({ prisma }, { kanal }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            if (!kanal.isTextBased()) {
              return errorFollowUp(itx, "Kanał musi być kanałem tekstowym");
            }

            await prisma.guildSettings.upsert({
              where: { guildId: itx.guildId },
              create: {
                guildId: itx.guildId,
                birthdayChannelId: kanal.id,
              },
              update: {
                birthdayChannelId: kanal.id,
              },
            });

            await itx.editReply(
              `✅ Ustawiono kanał urodzinowy na ${channelMention(kanal.id)}`,
            );
          }),
      )
      .addCommand("usun-uzytkownika", (command) =>
        command
          .setDescription("Usuń urodziny użytkownika")
          .addUser("uzytkownik", (option) =>
            option
              .setDescription("Użytkownik którego urodziny mają być usunięte")
              .setRequired(true),
          )
          .handle(async ({ prisma }, { uzytkownik }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const deleted = await prisma.birthday
              .delete({
                where: { userId: uzytkownik.id },
              })
              .catch(() => null);

            if (!deleted) {
              return errorFollowUp(itx, "Nie znaleziono urodzin dla tego użytkownika");
            }

            await itx.editReply(
              `✅ Usunięto urodziny użytkownika ${userMention(uzytkownik.id)}`,
            );
          }),
      ),
  )
  .handle("clientReady", async ({ prisma, messageQueue }, client) => {
    console.log("Birthday module ready!");

    // Schedule birthday messages immediately on startup
    try {
      await scheduleBirthdayMessages(prisma, messageQueue);
    } catch (error) {
      console.error("Error scheduling birthday messages on startup:", error);
    }

    // Then check every hour
    setInterval(async () => {
      try {
        await scheduleBirthdayMessages(prisma, messageQueue);
      } catch (error) {
        console.error("Error scheduling birthday messages:", error);
      }
    }, CHECK_INTERVAL_MS);
  });
