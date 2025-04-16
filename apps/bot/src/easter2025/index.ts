import { Hashira, waitForConfirmation } from "@hashira/core";
import {
  type Easter2025Stage,
  type Easter2025Team,
  type ExtendedPrismaClient,
  type PrismaTransaction,
  easter2025getTeamActivity,
  easter2025getTeamPerPersonActivity,
} from "@hashira/db";
import {
  type Client,
  EmbedBuilder,
  type GuildMember,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  bold,
  heading,
  userMention,
} from "discord.js";
import { sample } from "es-toolkit";
import { base } from "../base";
import { discordTry } from "../util/discordTry";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import safeSendCode from "../util/safeSendCode";

const getRandomTeam = async (prisma: PrismaTransaction) => {
  const existingTeams = await prisma.easter2025Team.findMany();

  return sample(existingTeams);
};

const formatMilestoneProgress = (
  totalPoints: number | bigint,
  nextMilestone: Easter2025Stage | null,
) => {
  if (!nextMilestone) {
    return `${bold("Wszystkie etapy ukończone!")} Zebrano ${bold(totalPoints.toString())} wiadomości.`;
  }

  const progress = (Number(totalPoints) / nextMilestone.neededPoints) * 100;

  return `${bold(totalPoints.toString())}/${nextMilestone.neededPoints} wiadomości (${progress.toFixed(1)}%)`;
};

const updateMembership = async (
  prisma: PrismaTransaction,
  member: GuildMember,
  teamId: number,
) => {
  await ensureUserExists(prisma, member);

  const userId = member.user.id;

  const existingMembership = await prisma.easter2025TeamMember.findUnique({
    where: { userId },
    select: { team: { select: { roleId: true } } },
  });

  const teamMember = await prisma.easter2025TeamMember.upsert({
    where: { userId },
    update: { teamId },
    create: { userId, teamId },
    select: { team: { select: { roleId: true } } },
  });

  if (existingMembership) {
    return {
      previousRoleId: existingMembership.team.roleId,
      newRoleId: teamMember.team.roleId,
    };
  }

  return { previousRoleId: null, newRoleId: teamMember.team.roleId };
};

const getNextMilestone = (prisma: PrismaTransaction, teamId: number) => {
  return prisma.easter2025Stage.findFirst({
    where: { teamId, completedAt: null },
    orderBy: { neededPoints: "asc" },
  });
};

const getCurrentMilestone = (prisma: PrismaTransaction, teamId: number) => {
  return prisma.easter2025Stage.findFirst({
    where: { teamId, completedAt: { not: null } },
    orderBy: { neededPoints: "desc" },
  });
};

export const easter2025 = new Hashira({ name: "easter2025" })
  .use(base)
  .group("rozbij-jajco", (group) =>
    group
      .setDescription("Event Wielkanocny 2025 - Rozbij jajco!")
      .addCommand("dolacz", (command) =>
        command
          .setDescription("Dołącz do eventu Rozbij Jajco 2025")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const existingMembership = await prisma.easter2025TeamMember.findUnique({
              where: { userId: itx.user.id },
              select: { team: { select: { name: true } } },
            });

            if (existingMembership) {
              await itx.editReply({
                content: `Jesteś już członkiem drużyny ${existingMembership.team.name}! Nie możesz dołączyć ponownie.`,
              });

              return;
            }

            const team = await getRandomTeam(prisma);

            const result = await updateMembership(prisma, itx.member, team.id);

            if (result.previousRoleId) {
              await itx.member.roles.remove(result.previousRoleId, "Zmieniono drużynę");
            }

            await itx.member.roles.add(team.roleId, "Dołączenie do drużyny");

            await itx.editReply({
              content: `Witaj w drużynie ${bold(
                team.name,
              )}! Od teraz Twoja aktywność tekstowa liczy się do ogólnej puli eventu Rozbij jajco!`,
            });
          }),
      ),
  )
  .group("rozbij-jajco-admin", (group) =>
    group
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .setDescription("Zarządzanie eventem Rozbij Jajco 2025")
      .addCommand("info", (command) =>
        command
          .setDescription("Wyświetl informacje o evencie Rozbij Jajco 2025")
          .handle(async (_, __, itx) => {
            const embed = new EmbedBuilder()
              .setTitle("🥚 Rozbij jajco! Event Wielkanocny 2025 🥚")
              .setDescription(
                "Trwa wielki event wielkanocny! Dołącz do jednej z drużyn i wspólnie pomagaj rozwijać event.\n\n" +
                  "Każda wiadomość wysłana na serwerze przez członka drużyny liczy się do ogólnego wyniku. " +
                  "Gdy osiągniemy kolejny próg, odblokujemy nową zawartość!",
              )
              .addFields(
                { name: "Jak dołączyć?", value: "Użyj komendy `/rozbij-jajco dolacz`" },
                {
                  name: "Jak sprawdzić postęp?",
                  value: "Użyj komendy `/rozbij-jajco druzyna`",
                },
              )
              .setColor("#FF9933");

            await itx.reply({ embeds: [embed] });
          }),
      )
      .addCommand("druzyna", (command) =>
        command
          .setDescription("Sprawdź swoją drużynę i leaderboard zaangażowania")
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .handle(async ({ prisma }, { druzyna }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const team = await prisma.easter2025Team.findUnique({
              where: { roleId: druzyna.id },
              select: { id: true, name: true },
            });

            if (!team) {
              return await errorFollowUp(itx, "Nie znaleziono podanej drużyny!");
            }

            const memberActivities = await prisma.$queryRawTyped(
              easter2025getTeamPerPersonActivity(team.id),
            );

            const totalActivity = memberActivities.reduce(
              // biome-ignore lint/style/noNonNullAssertion: This is some quirk of Prisma
              (sum, activity) => sum + activity.activity_count!,
              0n,
            );

            const nextMilestone = await getNextMilestone(prisma, team.id);

            const embed = new EmbedBuilder()
              .setTitle(`Drużyna: ${team.name}`)
              .setDescription(
                `**Postęp drużyny:**\n${formatMilestoneProgress(
                  totalActivity,
                  nextMilestone,
                )}`,
              )
              .setColor("#FF9933");

            const top10 = memberActivities.map((activity, index) => {
              const user = itx.client.users.cache.get(activity.userId);
              return `${index + 1}. ${user ? userMention(user.id) : activity.userId}: ${activity.activity_count} wiadomości`;
            });

            embed.addFields({
              name: "Top 10 najbardziej aktywnych członków:",
              value: top10.join("\n"),
            });

            await itx.editReply({ embeds: [embed] });
          }),
      )
      .addCommand("ping-druzyna", (command) =>
        command
          .setDescription("Wygeneruj listę ID członków drużyny do pingowania")
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .handle(async ({ prisma }, { druzyna }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const team = await prisma.easter2025Team.findUnique({
              where: { roleId: druzyna.id },
              include: { teamMembers: true },
            });

            if (!team) {
              return await errorFollowUp(itx, "Nie znaleziono podanej drużyny!");
            }

            const memberIds = team.teamMembers.map((member) => member.userId);

            await safeSendCode(itx.editReply.bind(itx), memberIds.join(" "), "");
          }),
      )
      .addCommand("zmien-jajco", (command) =>
        command
          .setDescription("Zmień drużynę użytkownika (tylko dla moderatorów)")
          .addUser("user", (option) => option.setDescription("Użytkownik"))
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .handle(async ({ prisma }, { user, druzyna }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const newTeam = await prisma.easter2025Team.findUnique({
              where: { roleId: druzyna.id },
            });

            if (!newTeam) {
              return await errorFollowUp(itx, "Nie znaleziono podanej drużyny!");
            }

            const targetMember = await itx.guild.members.fetch(user.id);

            const currentMembership = await prisma.easter2025TeamMember.findUnique({
              where: { userId: user.id },
              include: { team: true },
            });

            const confirmation = await waitForConfirmation(
              { send: itx.editReply.bind(itx) },
              `Czy na pewno chcesz zmienić drużynę użytkownika ${bold(user.tag)} ${
                currentMembership
                  ? `z ${bold(currentMembership.team.name)}`
                  : "(obecnie bez drużyny)"
              } na ${bold(newTeam.name)}?`,
              "Tak",
              "Nie",
              (action) => action.user.id === itx.user.id,
            );

            if (!confirmation) {
              await itx.editReply({
                content: "Anulowano zmianę drużyny.",
                components: [],
              });
              return;
            }

            const result = await updateMembership(prisma, targetMember, newTeam.id);

            if (result.previousRoleId) {
              await targetMember.roles.remove(
                result.previousRoleId,
                "Zmieniono drużynę",
              );
            }

            await targetMember.roles.add(newTeam.roleId, "Zmieniono drużynę");

            await itx.editReply({
              content: `Pomyślnie zmieniono drużynę użytkownika ${bold(user.tag)} na ${bold(
                newTeam.name,
              )}!`,
              components: [],
            });
          }),
      )
      .addCommand("dodaj-druzyne", (command) =>
        command
          .setDescription("Dodaj nową drużynę do eventu")
          .addString("nazwa", (option) => option.setDescription("Nazwa drużyny"))
          .addRole("rola", (option) => option.setDescription("Rola drużyny"))
          .addChannel("kanal", (option) =>
            option.setDescription("Kanal ze statusem drużyny"),
          )
          .handle(async ({ prisma }, { nazwa, rola, kanal }, itx) => {
            if (!itx.inCachedGuild()) return;

            if (!kanal.isTextBased()) {
              return await errorFollowUp(itx, "Podany kanał nie jest tekstowy!");
            }

            await itx.deferReply();

            const existingTeam = await prisma.easter2025Team.findUnique({
              where: { roleId: rola.id },
            });

            if (existingTeam) {
              return await errorFollowUp(itx, "Drużyna z tą rolą już istnieje!");
            }

            const newTeam = await prisma.easter2025Team.create({
              data: {
                name: nazwa,
                roleId: rola.id,
                statusChannelId: kanal.id,
              },
            });

            await itx.editReply({
              content: `Pomyślnie dodano drużynę ${bold(newTeam.name)}!`,
            });
          }),
      )
      .addCommand("dodaj-etap", (command) =>
        command
          .setDescription("Dodaj nowy etap do eventu")
          .addNumber("punkty", (option) =>
            option.setMinValue(0).setDescription("Liczba wiadomości do napisania"),
          )
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .addString("obrazek", (option) => option.setDescription("Link do obrazka"))
          .handle(async ({ prisma }, { punkty, druzyna, obrazek }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const team = await prisma.easter2025Team.findUnique({
              where: { roleId: druzyna.id },
            });

            if (!team) {
              return await errorFollowUp(itx, "Nie znaleziono podanej drużyny!");
            }

            const newStage = await prisma.easter2025Stage.create({
              data: {
                neededPoints: punkty,
                linkedImageUrl: obrazek,
                teamId: team.id,
              },
            });

            await itx.editReply({
              content: `Pomyślnie dodano nowy etap do drużyny ${bold(
                team.name,
              )}: ${bold(newStage.neededPoints.toString())} wiadomości!`,
            });
          }),
      ),
  )
  .handle("ready", async ({ prisma }, client) => {
    console.log("Easter 2025 module ready!");

    setInterval(async () => {
      try {
        await updateStatusChannel(client, prisma);
      } catch (error) {
        console.error("Error updating Easter 2025 status:", error);
      }
    }, 5 * 1000);

    await updateStatusChannel(client, prisma);
  });

const getTeamMessage = async (client: Client, team: Easter2025Team) => {
  const statusLastMessageId = team.statusLastMessageId;
  if (!statusLastMessageId) return null;

  const channel = client.channels.cache.get(team.statusChannelId);
  if (!channel || !channel.isSendable()) {
    throw new Error(`Channel ${team.statusChannelId} is not sendable or not found.`);
  }

  return await discordTry(
    () => channel.messages.fetch({ message: statusLastMessageId, cache: false }),
    [RESTJSONErrorCodes.UnknownMessage],
    () => null,
  );
};

async function updateTeamStatus(
  client: Client,
  prisma: ExtendedPrismaClient,
  team: Easter2025Team,
) {
  const channel = client.channels.cache.get(team.statusChannelId);
  if (!channel || !channel.isSendable()) return;

  const [teamActivity] = await prisma.$queryRawTyped(
    easter2025getTeamActivity(team.id),
  );

  if (!teamActivity) {
    console.error(`No activity data found for team ${team.name}`);
    return;
  }

  const totalActivity = teamActivity.total_activity_count ?? 0;

  const [currentMilestone, nextMilestone] = await prisma.$transaction([
    getCurrentMilestone(prisma, team.id),
    getNextMilestone(prisma, team.id),
  ]);

  if (!currentMilestone) {
    console.error(`No current milestone found for team ${team.name}`);
    return;
  }

  if (nextMilestone && nextMilestone.neededPoints <= totalActivity) {
    await prisma.easter2025Stage.update({
      where: {
        teamId_neededPoints: {
          teamId: team.id,
          neededPoints: nextMilestone.neededPoints,
        },
      },
      data: { completedAt: new Date() },
    });
  }

  const progressDescription = formatMilestoneProgress(totalActivity, nextMilestone);

  const lines = [heading(`Status drużyny: ${team.name}`), progressDescription];

  const embed = new EmbedBuilder()
    .setDescription(lines.join("\n"))
    .setImage(currentMilestone.linkedImageUrl)
    .setColor("#FF9933");

  const message = await getTeamMessage(client, team);

  if (message) {
    await message.edit({ embeds: [embed] });
    return;
  }

  const sentMessage = await channel.send({ embeds: [embed] });
  await prisma.easter2025Team.update({
    where: { id: team.id },
    data: { statusLastMessageId: sentMessage.id },
  });
}

async function updateStatusChannel(client: Client, prisma: ExtendedPrismaClient) {
  const teams = await prisma.easter2025Team.findMany();

  return Promise.all(
    teams.map(async (team) => {
      await updateTeamStatus(client, prisma, team);
    }),
  );
}
