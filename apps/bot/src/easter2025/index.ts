import { Hashira, PaginatedView, waitForConfirmation } from "@hashira/core";
import {
  DatabasePaginator,
  type Easter2025Stage,
  type Easter2025Team,
  type ExtendedPrismaClient,
  type PrismaTransaction,
} from "@hashira/db";
import { isAfter } from "date-fns";
import {
  type Client,
  EmbedBuilder,
  type GuildMember,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  bold,
  channelMention,
  hyperlink,
  roleMention,
  userMention,
} from "discord.js";
import { isNil, sample, take } from "es-toolkit";
import { base } from "../base";
import { discordTry } from "../util/discordTry";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import safeSendCode from "../util/safeSendCode";

const getTeamActivity = async (
  prisma: PrismaTransaction,
  teamId: number,
): Promise<{ userId: string; activity_count: bigint }[]> => {
  return prisma.$queryRaw`SELECT
  uta."userId",
  COUNT(*) AS activity_count
FROM "userTextActivity" uta
INNER JOIN "Easter2025TeamMember" tm
  ON uta."userId" = tm."userId"
LEFT JOIN "Easter2025DisabledChannels" dc
  ON uta."channelId" = dc."channelId"
WHERE
  tm."teamId" = ${teamId}
  AND uta."timestamp" >= tm."joinedAt"
  AND dc."channelId" IS NULL
GROUP BY
  uta."userId"
ORDER BY
  activity_count;
`;
};

const getRandomTeam = async (prisma: PrismaTransaction) => {
  const existingTeams = await prisma.easter2025Team.findMany();

  return sample(existingTeams);
};

const formatMilestoneProgress = (
  totalPoints: number | bigint,
  currentMilestone: Easter2025Stage | null,
  nextMilestone: Easter2025Stage | null,
) => {
  const neededPoints = nextMilestone?.neededPoints ?? currentMilestone?.neededPoints;

  if (isNil(neededPoints)) {
    return "Nie znaleziono progu!";
  }

  const progress = (Number(totalPoints) / neededPoints) * 100;
  const ending = Number.isNaN(progress) ? "" : ` (${progress.toFixed(1)}%)`;

  return `${totalPoints}/${bold(neededPoints.toString())} wiadomości${ending}`;
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

const getTeamEmbed = async (
  prisma: ExtendedPrismaClient,
  team: Pick<Easter2025Team, "id" | "name" | "color">,
) => {
  const activities = await getTeamActivity(prisma, team.id);

  const totalActivity = activities.reduce(
    // biome-ignore lint/style/noNonNullAssertion: This is some quirk of Prisma
    (sum, activity) => sum + activity.activity_count!,
    0n,
  );

  const [currentMilestone, nextMilestone] = await prisma.$transaction([
    getCurrentMilestone(prisma, team.id),
    getNextMilestone(prisma, team.id),
  ]);

  const passedThreshold = nextMilestone && nextMilestone.neededPoints <= totalActivity;

  if (passedThreshold) {
    // This will be updated in the next update
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

  const embed = new EmbedBuilder()
    .setTitle(`Drużyna: ${team.name}`)
    .setDescription(
      `**Postęp drużyny:** ${formatMilestoneProgress(totalActivity, currentMilestone, nextMilestone)}`,
    )
    .setColor(team.color);

  if (currentMilestone) {
    embed.setImage(currentMilestone.linkedImageUrl);
  }

  const top10 = take(activities, 10).map((activity, index) => {
    return `${index + 1}. ${userMention(activity.userId)}: ${activity.activity_count} wiadomości`;
  });

  if (top10.length > 0) {
    embed.addFields({
      name: "Top 10 najbardziej aktywnych członków:",
      value: top10.join("\n"),
    });
  }

  return { embed, passedThreshold };
};

const isEventOpen = (member: GuildMember) => {
  if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) return true;

  const eventStartDate = new Date("2025-04-17T12:00:00+02:00");

  return isAfter(new Date(), eventStartDate);
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
            if (!isEventOpen(itx.member)) return;

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
      )
      .addCommand("info", (command) =>
        command
          .setDescription("Wyświetl informacje o evencie Rozbij Jajco 2025")
          .handle(async (_, __, itx) => {
            const lines = [
              "Trwa event event wielkanocny! Dołącz do jednej z drużyn i rozbijajcie jajo razem!",
              "Każda wiadomość wysłana na serwerze przez członka drużyny liczy się do ogólnego wyniku.",
              "Każdy próg odblokowuje nową zawartość, a drużyna, która osiągnie wszystkie progi jako pierwsza, wygrywa!",
            ];

            const embed = new EmbedBuilder()
              .setTitle("🥚 Rozbij jajco! 🥚")
              .setDescription(lines.join("\n"))
              .addFields(
                { name: "Jak dołączyć?", value: "Użyj komendy `/rozbij-jajco dolacz`" },
                {
                  name: "Jak sprawdzić postęp?",
                  value: "Spójrz na kanał swojej drużyny.",
                },
              )
              .setColor("#FF9933");

            await itx.reply({ embeds: [embed] });
          }),
      ),
  )
  .group("rozbij-jajco-admin", (group) =>
    group
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .setDescription("Zarządzanie eventem Rozbij Jajco 2025")
      .addCommand("ping-druzyna", (command) =>
        command
          .setDescription("Wygeneruj listę ID członków drużyny do pingowania")
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .handle(async ({ prisma }, { druzyna: teamRole }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const team = await prisma.easter2025Team.findUnique({
              where: { roleId: teamRole.id },
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
          .handle(async ({ prisma }, { user, druzyna: teamRole }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const newTeam = await prisma.easter2025Team.findUnique({
              where: { roleId: teamRole.id },
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
          .addString("kolor", (option) => option.setDescription("Kolor drużyny (hex)"))
          .handle(
            async (
              { prisma },
              { nazwa: name, rola: teamRole, kanal: channel, kolor: colorHex },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;

              const color = Bun.color(colorHex, "number");

              if (!color) {
                return await errorFollowUp(itx, "Podany kolor nie jest poprawny!");
              }

              if (!channel.isTextBased()) {
                return await errorFollowUp(itx, "Podany kanał nie jest tekstowy!");
              }

              await itx.deferReply();

              const existingTeam = await prisma.easter2025Team.findUnique({
                where: { roleId: teamRole.id },
              });

              if (existingTeam) {
                return await errorFollowUp(itx, "Drużyna z tą rolą już istnieje!");
              }

              const newTeam = await prisma.easter2025Team.create({
                data: {
                  name: name,
                  roleId: teamRole.id,
                  statusChannelId: channel.id,
                  color,
                },
              });

              await itx.editReply({
                content: `Pomyślnie dodano drużynę ${bold(newTeam.name)}!`,
              });
            },
          ),
      )
      .addCommand("dodaj-etap", (command) =>
        command
          .setDescription("Dodaj nowy etap do eventu")
          .addNumber("punkty", (option) =>
            option.setMinValue(0).setDescription("Liczba wiadomości do napisania"),
          )
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .addString("obrazek", (option) => option.setDescription("Link do obrazka"))
          .handle(
            async (
              { prisma },
              { punkty: points, druzyna: teamRole, obrazek: image },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              const team = await prisma.easter2025Team.findUnique({
                where: { roleId: teamRole.id },
              });

              if (!team) {
                return await errorFollowUp(itx, "Nie znaleziono podanej drużyny!");
              }

              const newStage = await prisma.easter2025Stage.create({
                data: {
                  neededPoints: points,
                  linkedImageUrl: image,
                  teamId: team.id,
                },
              });

              await itx.editReply({
                content: `Pomyślnie dodano nowy etap do drużyny ${bold(
                  team.name,
                )}: ${bold(newStage.neededPoints.toString())} wiadomości!`,
              });
            },
          ),
      )
      .addCommand("dodaj-wylaczone-kanal", (command) =>
        command
          .setDescription("Dodaj kanał, który nie będzie liczony do eventu")
          .addString("kanaly", (option) =>
            option.setDescription("Kanał do wykluczenia"),
          )
          .handle(async ({ prisma }, { kanaly: rawChannels }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const channels = rawChannels.split(",").map((channel) => channel.trim());

            const { count } = await prisma.easter2025DisabledChannels.createMany({
              data: channels.map((channel) => ({ channelId: channel })),
            });

            await itx.editReply({
              content: `Pomyślnie dodano ${count} kanałów do listy wykluczonych!`,
            });
          }),
      )
      .addCommand("wylaczone-kanaly", (command) =>
        command
          .setDescription("Wyświetl listę wykluczonych kanałów")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const paginator = new DatabasePaginator(
              (props) => prisma.easter2025DisabledChannels.findMany(props),
              () => prisma.easter2025DisabledChannels.count(),
            );

            const paginatedView = new PaginatedView(
              paginator,
              "Wykluczone kanały",
              (channel) => {
                return `Kanał ${channelMention(channel.channelId)} (${channel.channelId})`;
              },
              true,
            );
            await paginatedView.render(itx);
          }),
      )
      .addCommand("etapy", (command) =>
        command
          .setDescription("Wyświetl etapy eventu")
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .handle(async ({ prisma }, { druzyna: teamRole }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const where = { team: { roleId: teamRole.id } };
            const paginator = new DatabasePaginator(
              (props, order) =>
                prisma.easter2025Stage.findMany({
                  where,
                  orderBy: { neededPoints: order },
                  ...props,
                }),
              () => prisma.easter2025Stage.count({ where }),
            );

            const paginatedView = new PaginatedView(
              paginator,
              "Etapy eventu dla drużyny",
              (stage, idx) => {
                const imageLink = hyperlink("[OBRAZEK]", stage.linkedImageUrl);
                return `${idx}. ${bold(stage.neededPoints.toString())} wiadomości ${imageLink}`;
              },
              true,
            );

            await paginatedView.render(itx);
          }),
      )
      .addCommand("wyczysc-etapy", (command) =>
        command
          .setDescription("Wyczyść etapy eventu")
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .handle(async ({ prisma }, { druzyna: teamRole }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const team = await prisma.easter2025Team.findUnique({
              where: { roleId: teamRole.id },
            });

            if (!team) {
              return await errorFollowUp(itx, "Nie znaleziono podanej drużyny!");
            }

            const confirmation = await waitForConfirmation(
              { send: itx.editReply.bind(itx) },
              `Czy na pewno chcesz usunąć wszystkie etapy drużyny ${bold(team.name)}?`,
              "Tak",
              "Nie",
              (action) => action.user.id === itx.user.id,
            );

            if (!confirmation) {
              await itx.editReply({
                content: "Anulowano usunięcie etapów.",
                components: [],
              });
              return;
            }

            await prisma.easter2025Stage.deleteMany({
              where: { teamId: team.id },
            });

            await itx.editReply({
              content: `Pomyślnie usunięto wszystkie etapy drużyny ${bold(team.name)}!`,
            });
          }),
      ),
  )
  .handle("ready", async ({ prisma }, client) => {
    console.log("Easter 2025 module ready!");

    // setInterval(async () => {
    //   try {
    //     await updateStatusChannel(client, prisma);
    //   } catch (error) {
    //     console.error("Error updating Easter 2025 status:", error);
    //   }
    // }, 5 * 1000);

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

  const { embed, passedThreshold } = await getTeamEmbed(prisma, team);
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

  if (passedThreshold) {
    await channel.send({
      content: `Gratulacje! ${roleMention(team.roleId)}, osiągnęliście nowy próg!`,
    });
  }
}

async function updateStatusChannel(client: Client, prisma: ExtendedPrismaClient) {
  const teams = await prisma.easter2025Team.findMany();

  return Promise.all(
    teams.map(async (team) => {
      await updateTeamStatus(client, prisma, team);
    }),
  );
}
