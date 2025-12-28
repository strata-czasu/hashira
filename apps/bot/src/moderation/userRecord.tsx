import { Hashira } from "@hashira/core";
import type { PrismaClient } from "@hashira/db";
import { Container, type JSXNode, render, TextDisplay } from "@hashira/jsx";
import { secondsToHours, sub } from "date-fns";
import {
  bold,
  type Guild,
  type GuildMember,
  HeadingLevel,
  heading,
  italic,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  strikethrough,
  subtext,
  TimestampStyles,
  time,
  type User,
} from "discord.js";
import { base } from "../base";
import { getUserTextActivity, getUserVoiceActivity } from "../userActivity/util";
import { discordTry } from "../util/discordTry";
import { ensureUserExists } from "../util/ensureUsersExist";
import { truncate } from "../util/truncate";
import { formatMuteLength } from "./util";
import { formatVerificationType } from "./verification";

async function formatVerification(prisma: PrismaClient, guild: Guild, user: User) {
  const verification = await prisma.verification.findFirst({
    where: {
      guildId: guild.id,
      userId: user.id,
      acceptedAt: { not: null },
    },
    orderBy: { acceptedAt: "desc" },
  });
  if (!verification?.acceptedAt) return formatVerificationType(null);

  return `${formatVerificationType(verification.type)} (przyjęto ${time(verification.acceptedAt, TimestampStyles.ShortDateTime)})`;
}

const formatActivities = (voiceActivitySeconds: number, textActivity: number) => {
  const parts = [
    `🎙️ ${secondsToHours(voiceActivitySeconds)}h`,
    `🗨️ ${textActivity} wiad.`,
  ];
  return parts.join(" | ");
};

type FieldProps = {
  name: string;
  value: string;
};
function Field({ name, value }: FieldProps) {
  return <TextDisplay content={`${bold(name)}\n${value}`} />;
}

async function getMemberFields(
  prisma: PrismaClient,
  member: GuildMember,
  itxCreatedAt: Date,
): Promise<JSXNode[]> {
  const fields: JSXNode[] = [];

  // Mutes
  const mutes = await prisma.mute.findMany({
    where: {
      deletedAt: null,
      guildId: member.guild.id,
      userId: member.id,
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  if (mutes.length > 0) {
    const joinedMutes = mutes
      .map(
        (m) =>
          `${time(m.createdAt, TimestampStyles.ShortDateTime)}+${formatMuteLength(m)} ${truncate(italic(m.reason), 100)}`,
      )
      .join("\n");
    fields.push(<Field name="🔇 Ostatnie wyciszenia" value={joinedMutes} />);
  }

  // Warns
  const warns = await prisma.warn.findMany({
    where: {
      deletedAt: null,
      guildId: member.guild.id,
      userId: member.id,
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  if (warns.length > 0) {
    const joinedWarns = warns
      .map(
        (w) =>
          `${time(w.createdAt, TimestampStyles.ShortDateTime)} ${truncate(italic(w.reason), 100)}`,
      )
      .join("\n");
    fields.push(<Field name="⚠️ Ostatnie ostrzeżenia" value={joinedWarns} />);
  }

  // Channel restrictions
  const channelRestrictions = await prisma.channelRestriction.findMany({
    where: {
      guildId: member.guild.id,
      userId: member.id,
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  if (channelRestrictions.length > 0) {
    const joinedRestrictions = channelRestrictions
      .map((cr) => {
        const line = `${time(cr.createdAt, TimestampStyles.ShortDateTime)} ${truncate(italic(cr.reason), 100)}`;
        return cr.deletedAt ? strikethrough(line) : line;
      })
      .join("\n");
    fields.push(
      <Field name="🚫 Ostatnio odebrane dostępy" value={joinedRestrictions} />,
    );
  }

  // Ultimatum
  const ultimatums = await prisma.ultimatum.findMany({
    where: {
      guildId: member.guild.id,
      userId: member.id,
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  if (ultimatums.length > 0) {
    const joinedUltimatums = ultimatums
      .map((u) => {
        const line = `${time(u.createdAt, TimestampStyles.ShortDateTime)} ${truncate(italic(u.reason), 200)}`;
        return u.endedAt ? strikethrough(line) : line;
      })
      .join("\n");
    fields.push(<Field name="💀 Ostatnie ultimatum" value={joinedUltimatums} />);
  }

  // Activity
  const activitySince = sub(itxCreatedAt, { days: 30 });
  const textActivity30Days = await getUserTextActivity({
    prisma,
    guildId: member.guild.id,
    userId: member.id,
    since: activitySince,
  });

  const voiceActivitySeconds30Days = await getUserVoiceActivity({
    prisma,
    guildId: member.guild.id,
    userId: member.id,
    since: activitySince,
  });

  const textActivityAllTime = await getUserTextActivity({
    prisma,
    guildId: member.guild.id,
    userId: member.id,
  });

  const voiceActivitySecondsAllTime = await getUserVoiceActivity({
    prisma,
    guildId: member.guild.id,
    userId: member.id,
  });

  const activityLines = [
    `${formatActivities(voiceActivitySeconds30Days, textActivity30Days)} (30 dni)`,
    `${formatActivities(voiceActivitySecondsAllTime, textActivityAllTime)} (od początku)`,
  ];
  fields.push(<Field name="Aktywność" value={activityLines.join("\n")} />);

  return fields;
}

export const userRecord = new Hashira({ name: "user-record" })
  .use(base)
  .command("kartoteka", (command) =>
    command
      .setDescription("Sprawdź kartotekę użytkownika")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUser("user", (user) => user.setDescription("Użytkownik"))
      .handle(async ({ prisma }, { user }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        await ensureUserExists(prisma, user);
        const formattedVerification = await formatVerification(prisma, itx.guild, user);

        const member = await discordTry(
          async () => itx.guild.members.fetch(user.id),
          [RESTJSONErrorCodes.UnknownMember],
          () => null,
        );
        const memberFields = member
          ? await getMemberFields(prisma, member, itx.createdAt)
          : [];

        const opts = render(
          <Container>
            <TextDisplay
              content={heading(`Kartoteka ${user.tag}`, HeadingLevel.Three)}
            />

            <Field
              name="📆 Data założenia konta"
              value={`${time(user.createdAt, TimestampStyles.ShortDateTime)} (${time(user.createdAt, TimestampStyles.RelativeTime)})`}
            />
            {member?.joinedAt ? (
              <Field
                name="📆 Data dołączenia na serwer"
                value={`${time(member.joinedAt, TimestampStyles.ShortDateTime)} (${time(member.joinedAt, TimestampStyles.RelativeTime)})`}
              />
            ) : null}
            <Field name="🔞 Poziom weryfikacji" value={formattedVerification} />
            {memberFields}

            <TextDisplay content={subtext(user.id)} />
          </Container>,
        );

        await itx.editReply(opts);
      }),
  );
