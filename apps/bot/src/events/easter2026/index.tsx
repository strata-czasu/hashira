import { Hashira, PaginatedView, waitForConfirmation } from "@hashira/core";
import { DatabasePaginator, type PrismaTransaction } from "@hashira/db";
import {
  Bold,
  Br,
  Container,
  H1,
  InlineCode,
  Italic,
  render,
  TextDisplay,
} from "@hashira/jsx";
import { isAfter, isBefore } from "date-fns";
import {
  bold,
  channelMention,
  type GuildMember,
  PermissionFlagsBits,
  userMention,
} from "discord.js";
import { base } from "../../base";
import { parseDate } from "../../util/dateParsing";
import { ensureUserExists } from "../../util/ensureUsersExist";
import { errorFollowUp } from "../../util/errorFollowUp";
import { fetchMembers } from "../../util/fetchMembers";
import safeSendCode from "../../util/safeSendCode";
import { getTeamPointsByUser, getTeamTotalPoints } from "./pointsService";
import {
  buildTeamEmbed,
  type TeamWithFullConfig,
  updateTeamStatusMessage,
} from "./statusService";
import {
  findMembershipForEaster2026,
  joinRandomTeam,
  moveToTeam,
  removeFromTeam,
  setCaptain,
} from "./teamService";

const isEventOpen = (
  config: { eventStartDate: Date; eventEndDate: Date } | null,
  member: GuildMember,
): boolean => {
  if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) return true;
  if (!config) return false;
  const now = new Date();
  return isAfter(now, config.eventStartDate) && isBefore(now, config.eventEndDate);
};

const getEventConfig = (prisma: PrismaTransaction, guildId: string) =>
  prisma.easter2026Config.findUnique({
    where: { guildId },
    include: { disabledChannels: true, bonusChannels: true },
  });

const getTeamsWithFullConfig = async (
  prisma: PrismaTransaction,
  guildId: string,
): Promise<TeamWithFullConfig[]> => {
  const configs = await prisma.easter2026TeamConfig.findMany({
    where: { team: { guildId } },
    include: {
      team: {
        include: { _count: { select: { members: true } } },
      },
      stages: true,
    },
  });

  return configs.map((c) => ({
    ...c.team,
    easter2026TeamConfig: c,
    _count: c.team._count,
  }));
};

export const easter2026 = new Hashira({ name: "easter2026" })
  .use(base)
  .group("wielkanoc", (group) =>
    group
      .setDescription("Event Wielkanocny 2026")
      .addCommand("dolacz", (command) =>
        command
          .setDescription("Dołącz do eventu Wielkanoc 2026")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;

            const config = await getEventConfig(prisma, itx.guildId);
            if (!isEventOpen(config, itx.member)) {
              await errorFollowUp(itx, "Event jeszcze się nie rozpoczął!");
              return;
            }

            await itx.deferReply({ flags: "Ephemeral" });
            await ensureUserExists(prisma, itx.member);

            const result = await joinRandomTeam(prisma, itx.user.id, itx.guildId);

            if (!result.ok) {
              if (result.reason === "already_in_team") {
                await itx.editReply({
                  content:
                    "Jesteś już członkiem drużyny! Nie możesz dołączyć ponownie.",
                });
                return;
              }
              await itx.editReply({
                content: "Brak dostępnych drużyn!",
              });
              return;
            }

            const teamConfig = result.team.easter2026TeamConfig;
            await itx.member.roles.add(teamConfig.roleId, "Dołączenie do drużyny");

            await itx.editReply({
              content: `Witaj w drużynie ${bold(result.team.name)}! Od teraz Twoja aktywność tekstowa liczy się do ogólnej puli eventu!`,
            });
          }),
      )
      .addCommand("info", (command) =>
        command
          .setDescription("Wyświetl informacje o evencie Wielkanoc 2026")
          .handle(async (_, __, itx) => {
            const element = (
              <Container accentColor={0xff9933}>
                <TextDisplay>
                  <H1> 🥚 Event Wielkanocny </H1>
                  <Br />
                  Trwa event wielkanocny! Dołącz do jednej z drużyn i zdobywajcie punkty
                  razem! Każda wiadomość wysłana na serwerze przez członka drużyny liczy
                  się do ogólnego wyniku.
                  <Br />
                  <Bold>Jak dołączyć?</Bold> Użyj komendy{" "}
                  <InlineCode>/wielkanoc dolacz</InlineCode>
                  <Br />
                  <Bold>Jak sprawdzić postęp?</Bold> Użyj komendy{" "}
                  <InlineCode>/wielkanoc ranking-druzyny</InlineCode> lub{" "}
                  <InlineCode>/wielkanoc moja-druzyna</InlineCode>
                </TextDisplay>
              </Container>
            );

            await itx.reply(render(element));
          }),
      )
      .addCommand("ranking-druzyny", (command) =>
        command
          .setDescription("Ranking drużyn w evencie")
          .addString("data", (option) =>
            option
              .setDescription("Data (np. 2026-04-17) lub pomiń dla całego eventu")
              .setRequired(false),
          )
          .handle(async ({ prisma }, { data: rawDate }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const config = await getEventConfig(prisma, itx.guildId);
            if (!config) {
              await errorFollowUp(itx, "Event nie jest skonfigurowany!");
              return;
            }

            let since = config.eventStartDate;
            let until = config.eventEndDate;

            if (rawDate) {
              const parsed = parseDate(rawDate, "start", null);
              if (!parsed) {
                await errorFollowUp(
                  itx,
                  "Nieprawidłowy format daty. Przykład: 2026-04-17",
                );
                return;
              }
              since = parsed;
              until = new Date(parsed.getTime() + 24 * 60 * 60 * 1000 - 1);
            }

            const disabledChannelIds = config.disabledChannels.map(
              (dc) => dc.channelId,
            );
            const bonusChannels = config.bonusChannels.map((bc) => ({
              channelId: bc.channelId,
              date: bc.date,
              multiplier: bc.multiplier,
            }));

            const teams = await getTeamsWithFullConfig(prisma, itx.guildId);

            const rankings: { name: string; points: number; roleId: string }[] = [];
            for (const team of teams) {
              const points = await getTeamTotalPoints(
                prisma,
                team.id,
                since,
                until,
                config.dailyMessageCap,
                disabledChannelIds,
                bonusChannels,
              );
              rankings.push({
                name: team.name,
                points,
                roleId: team.easter2026TeamConfig.roleId,
              });
            }

            rankings.sort((a, b) => b.points - a.points);

            const description = rankings
              .map(
                (r, i) =>
                  `${i + 1}. **${r.name}** — ${r.points.toLocaleString("pl-PL")} pkt`,
              )
              .join("\n");

            const element = (
              <Container accentColor={0xffd700}>
                <TextDisplay>
                  <H1>Ranking drużyn</H1>
                  <Br />
                  {description || "Brak drużyn"}
                  <Br />
                  {rawDate ? <Italic>Dane dla: {rawDate}</Italic> : ""}
                </TextDisplay>
              </Container>
            );

            await itx.editReply(render(element));
          }),
      )
      .addCommand("ranking-userzy", (command) =>
        command
          .setDescription("Ranking użytkowników w evencie")
          .addString("data", (option) =>
            option
              .setDescription("Data (np. 2026-04-17) lub pomiń dla całego eventu")
              .setRequired(false),
          )
          .handle(async ({ prisma }, { data: rawDate }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const config = await getEventConfig(prisma, itx.guildId);
            if (!config) {
              await errorFollowUp(itx, "Event nie jest skonfigurowany!");
              return;
            }

            let since = config.eventStartDate;
            let until = config.eventEndDate;

            if (rawDate) {
              const parsed = parseDate(rawDate, "start", null);
              if (!parsed) {
                await errorFollowUp(
                  itx,
                  "Nieprawidłowy format daty. Przykład: 2026-04-17",
                );
                return;
              }
              since = parsed;
              until = new Date(parsed.getTime() + 24 * 60 * 60 * 1000 - 1);
            }

            const disabledChannelIds = config.disabledChannels.map(
              (dc) => dc.channelId,
            );
            const bonusChannels = config.bonusChannels.map((bc) => ({
              channelId: bc.channelId,
              date: bc.date,
              multiplier: bc.multiplier,
            }));

            const teams = await getTeamsWithFullConfig(prisma, itx.guildId);

            const allUsers: {
              userId: string;
              totalPoints: number;
              teamName: string;
            }[] = [];
            for (const team of teams) {
              const ranking = await getTeamPointsByUser(
                prisma,
                team.id,
                since,
                until,
                config.dailyMessageCap,
                disabledChannelIds,
                bonusChannels,
              );
              for (const user of ranking) {
                allUsers.push({ ...user, teamName: team.name });
              }
            }

            allUsers.sort((a, b) => b.totalPoints - a.totalPoints);

            const top20 = allUsers
              .slice(0, 20)
              .map(
                (u, i) =>
                  `${i + 1}. <@${u.userId}> (${u.teamName}) — ${u.totalPoints.toLocaleString("pl-PL")} pkt`,
              );

            const element = (
              <Container accentColor={0xffd700}>
                <TextDisplay>
                  <H1>Ranking użytkowników</H1>
                  <Br />
                  {top20.join("\n") || "Brak aktywności"}
                  {rawDate ? <Italic>Dane dla: {rawDate}</Italic> : null}
                </TextDisplay>
              </Container>
            );

            await itx.editReply(render(element));
          }),
      )
      .addCommand("moja-druzyna", (command) =>
        command
          .setDescription("Wyświetl szczegóły swojej drużyny")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const membership = await findMembershipForEaster2026(
              prisma,
              itx.user.id,
              itx.guildId,
            );

            if (!membership) {
              await errorFollowUp(
                itx,
                "Nie jesteś w żadnej drużynie! Użyj `/wielkanoc dolacz`.",
              );
              return;
            }

            const config = await getEventConfig(prisma, itx.guildId);
            if (!config) {
              await errorFollowUp(itx, "Event nie jest skonfigurowany!");
              return;
            }

            const disabledChannelIds = config.disabledChannels.map(
              (dc) => dc.channelId,
            );
            const bonusChannels = config.bonusChannels.map((bc) => ({
              channelId: bc.channelId,
              date: bc.date,
              multiplier: bc.multiplier,
            }));

            const teamsWithConfig = await getTeamsWithFullConfig(prisma, itx.guildId);
            const team = teamsWithConfig.find((t) => t.id === membership.team.id);

            if (!team) {
              await errorFollowUp(itx, "Nie znaleziono drużyny!");
              return;
            }

            const totalPoints = await getTeamTotalPoints(
              prisma,
              team.id,
              config.eventStartDate,
              config.eventEndDate,
              config.dailyMessageCap,
              disabledChannelIds,
              bonusChannels,
            );

            const topUsers = await getTeamPointsByUser(
              prisma,
              team.id,
              config.eventStartDate,
              config.eventEndDate,
              config.dailyMessageCap,
              disabledChannelIds,
              bonusChannels,
            );

            const element = buildTeamEmbed(team, totalPoints, topUsers);
            await itx.editReply(render(element));
          }),
      ),
  )
  .group("wielkanoc-admin", (group) =>
    group
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .setDescription("Zarządzanie eventem Wielkanoc 2026")
      .addCommand("konfiguruj", (command) =>
        command
          .setDescription("Skonfiguruj event Wielkanoc 2026")
          .addString("start", (option) =>
            option.setDescription("Data rozpoczęcia (np. 2026-04-02T12:00:00+02:00)"),
          )
          .addString("koniec", (option) =>
            option.setDescription("Data zakończenia (np. 2026-04-20T23:59:59+02:00)"),
          )
          .addInteger("limit-wiadomosci", (option) =>
            option
              .setDescription("Dzienny limit wiadomości na osobę")
              .setMinValue(1)
              .setRequired(false),
          )
          .addBoolean("auto-dolaczanie", (option) =>
            option
              .setDescription("Automatyczne dołączanie nowych użytkowników")
              .setRequired(false),
          )
          .handle(
            async (
              { prisma },
              {
                start: rawStart,
                koniec: rawEnd,
                "limit-wiadomosci": dailyCap,
                "auto-dolaczanie": autoAssign,
              },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              const eventStartDate = new Date(rawStart);
              const eventEndDate = new Date(rawEnd);

              if (
                Number.isNaN(eventStartDate.getTime()) ||
                Number.isNaN(eventEndDate.getTime())
              ) {
                await errorFollowUp(itx, "Nieprawidłowy format daty!");
                return;
              }

              await prisma.easter2026Config.upsert({
                where: { guildId: itx.guildId },
                create: {
                  guildId: itx.guildId,
                  eventStartDate,
                  eventEndDate,
                  ...(dailyCap ? { dailyMessageCap: dailyCap } : {}),
                  ...(autoAssign !== null ? { autoAssignNewMembers: autoAssign } : {}),
                },
                update: {
                  eventStartDate,
                  eventEndDate,
                  ...(dailyCap ? { dailyMessageCap: dailyCap } : {}),
                  ...(autoAssign !== null ? { autoAssignNewMembers: autoAssign } : {}),
                },
              });

              await itx.editReply({ content: "Pomyślnie skonfigurowano event!" });
            },
          ),
      )
      .addCommand("dodaj-druzyne", (command) =>
        command
          .setDescription("Dodaj nową drużynę do eventu")
          .addString("nazwa", (option) => option.setDescription("Nazwa drużyny"))
          .addRole("rola", (option) => option.setDescription("Rola drużyny"))
          .addChannel("kanal", (option) =>
            option.setDescription("Kanał ze statusem drużyny"),
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
                await errorFollowUp(itx, "Podany kolor nie jest poprawny!");
                return;
              }

              if (!channel.isTextBased()) {
                await errorFollowUp(itx, "Podany kanał nie jest tekstowy!");
                return;
              }

              await itx.deferReply();

              const existingConfig = await prisma.easter2026TeamConfig.findUnique({
                where: { roleId: teamRole.id },
              });

              if (existingConfig) {
                await errorFollowUp(itx, "Drużyna z tą rolą już istnieje!");
                return;
              }

              const team = await prisma.team.create({
                data: {
                  name,
                  guildId: itx.guildId,
                  easter2026TeamConfig: {
                    create: {
                      roleId: teamRole.id,
                      statusChannelId: channel.id,
                      color,
                    },
                  },
                },
                include: { easter2026TeamConfig: true },
              });

              await itx.editReply({
                content: `Pomyślnie dodano drużynę ${bold(team.name)}!`,
              });
            },
          ),
      )
      .addCommand("usun-druzyne", (command) =>
        command
          .setDescription("Usuń drużynę z eventu")
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .handle(async ({ prisma }, { druzyna: teamRole }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const config = await prisma.easter2026TeamConfig.findUnique({
              where: { roleId: teamRole.id },
              include: { team: true },
            });

            if (!config) {
              await errorFollowUp(itx, "Nie znaleziono podanej drużyny!");
              return;
            }

            const confirmation = await waitForConfirmation(
              { send: itx.editReply.bind(itx) },
              `Czy na pewno chcesz usunąć drużynę ${bold(config.team.name)}? To usunie wszystkich członków i etapy.`,
              "Tak",
              "Nie",
              (action) => action.user.id === itx.user.id,
            );

            if (!confirmation) {
              await itx.editReply({ content: "Anulowano.", components: [] });
              return;
            }

            await prisma.team.delete({ where: { id: config.teamId } });

            await itx.editReply({
              content: `Pomyślnie usunięto drużynę ${bold(config.team.name)}!`,
              components: [],
            });
          }),
      )
      .addCommand("zmien-druzyne", (command) =>
        command
          .setDescription("Zmień drużynę użytkownika")
          .addUser("user", (option) => option.setDescription("Użytkownik"))
          .addRole("druzyna", (option) =>
            option.setDescription("Docelowa rola drużyny"),
          )
          .handle(async ({ prisma }, { user, druzyna: teamRole }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const targetConfig = await prisma.easter2026TeamConfig.findUnique({
              where: { roleId: teamRole.id },
              include: { team: true },
            });

            if (!targetConfig) {
              await errorFollowUp(itx, "Nie znaleziono docelowej drużyny!");
              return;
            }

            const targetMember = await itx.guild.members.fetch(user.id);
            await ensureUserExists(prisma, targetMember);

            const result = await moveToTeam(
              prisma,
              user.id,
              targetConfig.teamId,
              itx.guildId,
            );

            if (!result.ok) {
              const messages = {
                not_in_team: "Użytkownik nie jest w żadnej drużynie!",
                same_team: "Użytkownik jest już w tej drużynie!",
                target_not_found: "Docelowa drużyna nie istnieje!",
              };
              await errorFollowUp(itx, messages[result.reason]);
              return;
            }

            await targetMember.roles.remove(
              result.previousTeam.easter2026TeamConfig.roleId,
              "Zmieniono drużynę",
            );
            await targetMember.roles.add(targetConfig.roleId, "Zmieniono drużynę");

            await itx.editReply({
              content: `Zmieniono drużynę ${bold(user.tag)} z ${bold(result.previousTeam.name)} na ${bold(targetConfig.team.name)}!`,
            });
          }),
      )
      .addCommand("wyrzuc-z-druzyny", (command) =>
        command
          .setDescription("Usuń użytkownika z drużyny")
          .addUser("user", (option) => option.setDescription("Użytkownik"))
          .handle(async ({ prisma }, { user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            await ensureUserExists(prisma, user);

            const result = await removeFromTeam(prisma, user.id, itx.guildId);

            if (!result.ok) {
              await errorFollowUp(itx, "Użytkownik nie jest w żadnej drużynie!");
              return;
            }

            const targetMember = await itx.guild.members.fetch(user.id);
            await targetMember.roles.remove(
              result.team.easter2026TeamConfig.roleId,
              "Usunięto z drużyny",
            );

            await itx.editReply({
              content: `Usunięto ${bold(user.tag)} z drużyny ${bold(result.team.name)}!`,
            });
          }),
      )
      .addCommand("wyznacz-kapitana", (command) =>
        command
          .setDescription("Wyznacz kapitana drużyny (kosmetyczne)")
          .addUser("user", (option) => option.setDescription("Użytkownik"))
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .handle(async ({ prisma }, { user, druzyna: teamRole }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const config = await prisma.easter2026TeamConfig.findUnique({
              where: { roleId: teamRole.id },
              include: { team: true },
            });

            if (!config) {
              await errorFollowUp(itx, "Nie znaleziono podanej drużyny!");
              return;
            }

            await ensureUserExists(prisma, user);

            await setCaptain(prisma, config.id, user.id);

            await itx.editReply({
              content: `${bold(user.tag)} został kapitanem drużyny ${bold(config.team.name)}!`,
            });
          }),
      )
      .addCommand("dodaj-etap", (command) =>
        command
          .setDescription("Dodaj nowy etap do eventu")
          .addNumber("punkty", (option) =>
            option.setMinValue(0).setDescription("Liczba punktów do osiągnięcia"),
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

              const config = await prisma.easter2026TeamConfig.findUnique({
                where: { roleId: teamRole.id },
                include: { team: true },
              });

              if (!config) {
                await errorFollowUp(itx, "Nie znaleziono podanej drużyny!");
                return;
              }

              await prisma.easter2026Stage.create({
                data: {
                  teamConfigId: config.id,
                  neededPoints: points,
                  linkedImageUrl: image,
                },
              });

              await itx.editReply({
                content: `Dodano etap ${bold(points.toString())} pkt do drużyny ${bold(config.team.name)}!`,
              });
            },
          ),
      )
      .addCommand("wyczysc-etapy", (command) =>
        command
          .setDescription("Wyczyść etapy eventu")
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .handle(async ({ prisma }, { druzyna: teamRole }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const config = await prisma.easter2026TeamConfig.findUnique({
              where: { roleId: teamRole.id },
              include: { team: true },
            });

            if (!config) {
              await errorFollowUp(itx, "Nie znaleziono podanej drużyny!");
              return;
            }

            const confirmation = await waitForConfirmation(
              { send: itx.editReply.bind(itx) },
              `Czy na pewno chcesz usunąć wszystkie etapy drużyny ${bold(config.team.name)}?`,
              "Tak",
              "Nie",
              (action) => action.user.id === itx.user.id,
            );

            if (!confirmation) {
              await itx.editReply({ content: "Anulowano.", components: [] });
              return;
            }

            await prisma.easter2026Stage.deleteMany({
              where: { teamConfigId: config.id },
            });

            await itx.editReply({
              content: `Usunięto wszystkie etapy drużyny ${bold(config.team.name)}!`,
              components: [],
            });
          }),
      )
      .addCommand("dodaj-wylaczony-kanal", (command) =>
        command
          .setDescription("Dodaj kanał wykluczony z naliczania punktów")
          .addString("kanaly", (option) =>
            option.setDescription("ID kanałów (oddzielone przecinkami)"),
          )
          .handle(async ({ prisma }, { kanaly: rawChannels }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const eventConfig = await getEventConfig(prisma, itx.guildId);
            if (!eventConfig) {
              await errorFollowUp(itx, "Event nie jest skonfigurowany!");
              return;
            }

            const channels = rawChannels.split(",").map((c) => c.trim());

            const { count } = await prisma.easter2026DisabledChannel.createMany({
              data: channels.map((channelId) => ({
                configId: eventConfig.id,
                channelId,
              })),
              skipDuplicates: true,
            });

            await itx.editReply({
              content: `Dodano ${count} kanałów do listy wykluczonych!`,
            });
          }),
      )
      .addCommand("wylaczone-kanaly", (command) =>
        command
          .setDescription("Wyświetl listę wykluczonych kanałów")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const eventConfig = await getEventConfig(prisma, itx.guildId);
            if (!eventConfig) {
              await errorFollowUp(itx, "Event nie jest skonfigurowany!");
              return;
            }

            const where = { configId: eventConfig.id };
            const paginator = new DatabasePaginator(
              (props) => prisma.easter2026DisabledChannel.findMany({ ...props, where }),
              () => prisma.easter2026DisabledChannel.count({ where }),
            );

            const paginatedView = new PaginatedView(
              paginator,
              "Wykluczone kanały",
              (channel) =>
                `Kanał ${channelMention(channel.channelId)} (${channel.channelId})`,
              true,
            );
            await paginatedView.render(itx);
          }),
      )
      .addCommand("ustaw-bonus-kanal", (command) =>
        command
          .setDescription("Ustaw dzienny kanał bonusowy")
          .addChannel("kanal", (option) => option.setDescription("Kanał bonusowy"))
          .addString("data", (option) => option.setDescription("Data (np. 2026-04-17)"))
          .addNumber("mnoznik", (option) => option.setDescription("Mnożnik punktów"))
          .handle(
            async (
              { prisma },
              { kanal: channel, data: rawDate, mnoznik: multiplier },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply();

              const eventConfig = await getEventConfig(prisma, itx.guildId);
              if (!eventConfig) {
                await errorFollowUp(itx, "Event nie jest skonfigurowany!");
                return;
              }

              const date = new Date(rawDate);
              if (Number.isNaN(date.getTime())) {
                await errorFollowUp(itx, "Nieprawidłowy format daty!");
                return;
              }

              await prisma.easter2026BonusChannel.upsert({
                where: {
                  configId_date: {
                    configId: eventConfig.id,
                    date,
                  },
                },
                create: {
                  configId: eventConfig.id,
                  channelId: channel.id,
                  date,
                  multiplier,
                },
                update: {
                  channelId: channel.id,
                  multiplier,
                },
              });

              await itx.editReply({
                content: `Ustawiono kanał bonusowy ${channelMention(channel.id)} na ${rawDate} z mnożnikiem ${multiplier}x!`,
              });
            },
          ),
      )
      .addCommand("ping-druzyna", (command) =>
        command
          .setDescription("Wygeneruj listę ID członków drużyny do pingowania")
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .addBoolean("ping", (option) =>
            option.setDescription("Pinguj członków").setRequired(false),
          )
          .handle(async ({ prisma }, { druzyna: teamRole, ping = false }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const config = await prisma.easter2026TeamConfig.findUnique({
              where: { roleId: teamRole.id },
              include: {
                team: {
                  include: { members: true },
                },
              },
            });

            if (!config) {
              await errorFollowUp(itx, "Nie znaleziono podanej drużyny!");
              return;
            }

            const memberIds = config.team.members.map((m) => m.userId);

            if (memberIds.length === 0) {
              await safeSendCode(
                itx.editReply.bind(itx),
                "Brak członków w drużynie.",
                "",
              );
              return;
            }

            let validMemberIds = memberIds;
            try {
              const guildMembers = await fetchMembers(itx.guild, memberIds);
              validMemberIds = memberIds.filter((id) => guildMembers.has(id));
            } catch (error) {
              console.error(
                "Błąd podczas pobierania członków dla ping-druzyna:",
                error,
              );
            }

            if (validMemberIds.length === 0) {
              await safeSendCode(
                itx.editReply.bind(itx),
                "Wszyscy członkowie odeszli z serwera.",
                "",
              );
              return;
            }

            if (ping) validMemberIds = validMemberIds.map((id) => userMention(id));

            await safeSendCode(itx.editReply.bind(itx), validMemberIds.join(" "), "");
          }),
      ),
  )
  .handle("guildMemberAdd", async ({ prisma }, member) => {
    const config = await prisma.easter2026Config.findUnique({
      where: { guildId: member.guild.id },
    });

    if (!config?.autoAssignNewMembers) return;

    if (!isEventOpen(config, member)) return;

    await ensureUserExists(prisma, member.id);
    const result = await joinRandomTeam(prisma, member.id, member.guild.id);

    if (!result.ok && result.reason !== "already_in_team") return;

    await member.roles.add(
      result.team.easter2026TeamConfig.roleId,
      "Auto-dołączenie do eventu wielkanocnego",
    );
  })
  .handle("clientReady", async ({ prisma }, client) => {
    const updateAll = async () => {
      try {
        const configs = await prisma.easter2026Config.findMany({
          include: { disabledChannels: true, bonusChannels: true },
        });

        for (const config of configs) {
          const teams = await getTeamsWithFullConfig(prisma, config.guildId);
          const disabledChannelIds = config.disabledChannels.map((dc) => dc.channelId);
          const bonusChannels = config.bonusChannels.map((bc) => ({
            channelId: bc.channelId,
            date: bc.date,
            multiplier: bc.multiplier,
          }));

          for (const team of teams) {
            await updateTeamStatusMessage(
              client,
              prisma,
              team,
              config.dailyMessageCap,
              config.eventStartDate,
              config.eventEndDate,
              disabledChannelIds,
              bonusChannels,
            );
          }
        }
      } catch (error) {
        console.error("Error updating Easter 2026 status:", error);
      }
    };

    setInterval(updateAll, 60 * 1000);
    await updateAll();
  });
