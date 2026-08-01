import { Hashira } from "@hashira/core";
import { render } from "@hashira/jsx";
import {
  bold,
  type Client,
  channelMention,
  type Guild,
  PermissionFlagsBits,
  roleMention,
  TimestampStyles,
  time,
  userMention,
} from "discord.js";
import { base } from "../../base";
import { ensureUserExists } from "../../util/ensureUsersExist";
import { errorFollowUp } from "../../util/errorFollowUp";
import {
  findBirthday2026Config,
  setBirthday2026FeatureState,
  upsertBirthday2026Config,
} from "./configService";
import {
  type Birthday2026EconomyErrorReason,
  feedBirthday2026Pig,
  getBirthday2026EconomyStatus,
  grantBirthday2026Pasza,
  setupBirthday2026Economy,
} from "./economyService";
import {
  getBirthday2026EventState,
  getBirthday2026RegistrationState,
} from "./eventState";
import {
  type Birthday2026PublicErrorReason,
  type FeedBirthday2026PlayerResult,
  feedBirthday2026Player,
  getBirthday2026PlayerSnapshot,
} from "./playerService";
import {
  BIRTHDAY_2026_FEED_ALL_CUSTOM_ID,
  buildBirthday2026BalanceView,
  buildBirthday2026FeedResultView,
  buildBirthday2026InfoView,
  buildBirthday2026RankingView,
  buildBirthday2026StatusView,
} from "./playerView";
import {
  finalizeBirthday2026Registration,
  findBirthday2026RoleAssignments,
  registerBirthday2026Participant,
  withdrawBirthday2026Registration,
} from "./registrationService";
import { parseBirthday2026Instant, parseBirthday2026TeamColor } from "./staffInput";
import {
  configureBirthday2026Artwork,
  configureBirthday2026Milestones,
  configureBirthday2026Persona,
  reconcileBirthday2026StatusMessage,
} from "./statusService";
import {
  assignBirthday2026Member,
  createBirthday2026Team,
  findBirthday2026Teams,
  removeBirthday2026Member,
  setBirthday2026Captain,
  setBirthday2026Tucznik,
} from "./teamService";
import {
  awardBirthday2026TextPasza,
  configureBirthday2026TextEarning,
  disableBirthday2026TextChannel,
  enableBirthday2026TextChannel,
  findBirthday2026DisabledTextChannels,
  getBirthday2026TextEarningDiagnostics,
} from "./textEarningService";
import {
  configureBirthday2026VoiceEarning,
  getBirthday2026VoiceEarningDiagnostics,
} from "./voiceEarningService";

const teamErrorMessages = {
  already_in_team: "Ten użytkownik jest już w tej drużynie.",
  captain_already_assigned: "Ten użytkownik jest już kapitanem innej drużyny.",
  captain_move_requires_replacement:
    "Najpierw wyznacz zastępstwo albo usuń kapitana tej drużyny.",
  captain_not_member: "Kapitan musi należeć do wskazanej drużyny.",
  config_not_found: "Event urodzinowy nie jest jeszcze skonfigurowany.",
  invalid_activity_estimate: "Nie udało się obliczyć aktywności uczestnika.",
  member_not_found: "Ten użytkownik nie należy do żadnej drużyny.",
  no_teams: "Event nie ma jeszcze skonfigurowanych drużyn.",
  role_already_used: "Ta rola jest już używana przez drużynę eventową.",
  team_already_exists: "Drużyna o tej nazwie już istnieje na serwerze.",
  team_not_found: "Nie znaleziono wskazanej drużyny.",
  tucznik_already_assigned: "Ten użytkownik jest już Tucznikiem innej drużyny.",
  tucznik_not_configured: "Najpierw wyznacz Tucznika tej drużyny.",
  tucznik_move_requires_replacement:
    "Najpierw wyznacz innego Tucznika dla tej drużyny.",
  tucznik_not_member: "Tucznik musi należeć do wskazanej drużyny.",
};

const replyWithTeamError = (
  itx: Parameters<typeof errorFollowUp>[0],
  reason: keyof typeof teamErrorMessages,
) => errorFollowUp(itx, teamErrorMessages[reason]);

const economyErrorMessages: Record<Birthday2026EconomyErrorReason, string> = {
  config_not_found: "Event urodzinowy nie jest jeszcze skonfigurowany.",
  currency_conflict: "Nazwa albo symbol waluty są już używane na tym serwerze.",
  economy_already_configured: "Ekonomia jest już skonfigurowana z innymi wartościami.",
  economy_not_configured: "Najpierw skonfiguruj ekonomię eventu.",
  insufficient_balance: "Użytkownik nie ma wystarczającej ilości Paszy.",
  invalid_amount: "Ilość musi być dodatnią liczbą całkowitą.",
  invalid_currency: "Nazwa i symbol waluty nie mogą być puste.",
  invalid_digestion_delay: "Czas trawienia musi być nieujemną liczbą sekund.",
  invalid_source_key: "Klucz źródła nie może być pusty.",
  member_not_found: "Ten użytkownik nie należy do eventu.",
  team_wallet_not_found: "Drużyna nie ma poprawnie skonfigurowanego portfela.",
};

const replyWithEconomyError = (
  itx: Parameters<typeof errorFollowUp>[0],
  reason: Birthday2026EconomyErrorReason,
) => errorFollowUp(itx, economyErrorMessages[reason]);

const publicErrorMessages: Record<Birthday2026PublicErrorReason, string> = {
  economy_not_configured: "Ekonomia eventu nie jest jeszcze gotowa.",
  event_not_available: "Event nie jest teraz dostępny.",
  teams_not_ready: "Drużyny, ich Tucznicy i persony nie są jeszcze gotowi.",
};

type Birthday2026PlayerFeedErrorReason = Extract<
  FeedBirthday2026PlayerResult,
  { ok: false }
>["reason"];

const playerFeedErrorMessages: Record<Birthday2026PlayerFeedErrorReason, string> = {
  ...economyErrorMessages,
  event_not_available: "Event nie jest teraz dostępny.",
  event_not_open: "Karmienie jest dostępne tylko podczas trwania eventu.",
  teams_not_ready: "Drużyny, ich Tucznicy i persony nie są jeszcze gotowi.",
};

const registrationErrorMessages = {
  already_assigned: "Jesteś już przypisany do drużyny eventowej.",
  already_registered: "Jesteś już zapisany do eventu.",
  event_not_available: "Event nie jest teraz dostępny.",
  not_registered: "Nie jesteś zapisany do eventu.",
  registration_closed: "Zapisy do eventu są zamknięte.",
  roster_finalized: "Drużyny zostały już przydzielone.",
  teams_not_ready:
    "Wszystkie drużyny muszą najpierw mieć swoich Tuczników i zatwierdzone persony.",
};

const finalizationErrorMessages = {
  already_finalized: "Drużyny zostały już przydzielone.",
  config_not_found: "Event urodzinowy nie jest jeszcze skonfigurowany.",
  earning_not_configured: "Najpierw skonfiguruj zdobywanie Paszy za tekst i głos.",
  event_enabled: "Wyłącz event przed przydzieleniem drużyn.",
  registration_open: "Najpierw zamknij zapisy.",
  teams_not_ready:
    "Skonfiguruj dokładnie cztery drużyny, ich Tuczników i zatwierdzone persony.",
};

const getPlayerSnapshotOrReply = async (
  prisma: Parameters<typeof getBirthday2026PlayerSnapshot>[0],
  guildId: string,
  userId: string,
  now: Date,
  itx: Parameters<typeof errorFollowUp>[0],
) => {
  const result = await getBirthday2026PlayerSnapshot(prisma, guildId, userId, now);
  if (!result.ok) {
    await errorFollowUp(itx, publicErrorMessages[result.reason]);
    return null;
  }
  return result.snapshot;
};

const findTeamByRole = async (
  prisma: Parameters<typeof findBirthday2026Teams>[0],
  guildId: string,
  roleId: string,
) => {
  const teams = await findBirthday2026Teams(prisma, guildId);
  return teams.find((team) => team.roleId === roleId) ?? null;
};

const syncBirthday2026Roles = async (
  prisma: Parameters<typeof findBirthday2026RoleAssignments>[0],
  guild: Guild,
) => {
  const { assignments, roleIds } = await findBirthday2026RoleAssignments(
    prisma,
    guild.id,
  );
  const results = await Promise.allSettled(
    assignments.map(async (assignment) => {
      const member = await guild.members.fetch(assignment.userId);
      const oldRoles = roleIds.filter(
        (roleId) => roleId !== assignment.roleId && member.roles.cache.has(roleId),
      );
      if (oldRoles.length > 0) {
        await member.roles.remove(oldRoles, "Synchronizacja Birthday 2026");
      }
      if (!member.roles.cache.has(assignment.roleId)) {
        await member.roles.add(assignment.roleId, "Synchronizacja Birthday 2026");
      }
    }),
  );
  return {
    failed: results.filter((result) => result.status === "rejected").length,
    total: assignments.length,
  };
};

const updateBirthday2026Status = async (
  client: Client,
  prisma: Parameters<typeof reconcileBirthday2026StatusMessage>[1],
  teamConfigId: number,
) => {
  const result = await reconcileBirthday2026StatusMessage(client, prisma, teamConfigId);
  if (
    !result.ok &&
    result.reason !== "status_not_configured" &&
    result.reason !== "status_not_ready"
  ) {
    console.warn(`Failed to update Birthday 2026 status: ${result.reason}`);
  }
};

export const birthday2026 = new Hashira({ name: "birthday2026" })
  .use(base)
  .group("tucznik", (group) =>
    group
      .setDescription("Nakarm Tucznika swojej drużyny")
      .setDMPermission(false)
      .addCommand("dolacz", (command) =>
        command
          .setDescription("Zapisz się do eventu urodzinowego")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });
            await ensureUserExists(prisma, itx.user);

            const result = await registerBirthday2026Participant(
              prisma,
              itx.guildId,
              itx.user.id,
              itx.createdAt,
            );
            if (!result.ok) {
              await errorFollowUp(itx, registrationErrorMessages[result.reason]);
              return;
            }
            await itx.editReply(
              "Zapisano Cię do eventu. Drużynę poznasz po zamknięciu zapisów.",
            );
          }),
      )
      .addCommand("zrezygnuj", (command) =>
        command
          .setDescription("Wycofaj zapis przed zamknięciem zapisów")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const result = await withdrawBirthday2026Registration(
              prisma,
              itx.guildId,
              itx.user.id,
              itx.createdAt,
            );
            if (!result.ok) {
              await errorFollowUp(itx, registrationErrorMessages[result.reason]);
              return;
            }
            await itx.editReply("Wycofano Twój zapis do eventu.");
          }),
      )
      .addCommand("info", (command) =>
        command
          .setDescription("Pokaż zasady i czas trwania eventu")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const snapshot = await getPlayerSnapshotOrReply(
              prisma,
              itx.guildId,
              itx.user.id,
              itx.createdAt,
              itx,
            );
            if (!snapshot) return;

            await itx.editReply(render(buildBirthday2026InfoView(snapshot)));
          }),
      )
      .addCommand("saldo", (command) =>
        command
          .setDescription("Pokaż prywatne saldo i historię Paszy")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const snapshot = await getPlayerSnapshotOrReply(
              prisma,
              itx.guildId,
              itx.user.id,
              itx.createdAt,
              itx,
            );
            if (!snapshot) return;

            await itx.editReply(render(buildBirthday2026BalanceView(snapshot)));
          }),
      )
      .addCommand("nakarm", (command) =>
        command
          .setDescription("Przekaż Paszę Tucznikowi swojej drużyny")
          .addInteger("ilosc", (option) =>
            option.setDescription("Ilość Paszy").setMinValue(1),
          )
          .handle(async ({ prisma, messageQueue }, { ilosc: amount }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });
            await ensureUserExists(prisma, itx.user);

            const result = await feedBirthday2026Player(prisma, {
              guildId: itx.guildId,
              userId: itx.user.id,
              amount,
              sourceKey: itx.id,
              acceptedAt: itx.createdAt,
              reason: "Birthday 2026 player feed",
              scheduleDigestion: (tx, batch) =>
                messageQueue.push(
                  "birthday2026Digest",
                  { batchId: batch.id },
                  batch.digestAt,
                  batch.id.toString(),
                  tx,
                ),
            });
            if (!result.ok) {
              await errorFollowUp(itx, playerFeedErrorMessages[result.reason]);
              return;
            }
            await updateBirthday2026Status(itx.client, prisma, result.teamConfigId);

            const snapshot = await getPlayerSnapshotOrReply(
              prisma,
              itx.guildId,
              itx.user.id,
              itx.createdAt,
              itx,
            );
            if (!snapshot) return;

            await itx.editReply(
              render(
                buildBirthday2026FeedResultView(
                  snapshot,
                  result.batch.amount,
                  result.batch.digestAt,
                ),
              ),
            );
          }),
      )
      .addCommand("status", (command) =>
        command
          .setDescription("Pokaż stan wszystkich Tuczników")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const snapshot = await getPlayerSnapshotOrReply(
              prisma,
              itx.guildId,
              itx.user.id,
              itx.createdAt,
              itx,
            );
            if (!snapshot) return;

            await itx.editReply(render(buildBirthday2026StatusView(snapshot)));
          }),
      )
      .addCommand("ranking", (command) =>
        command
          .setDescription("Pokaż ranking stałej wagi Tuczników")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const snapshot = await getPlayerSnapshotOrReply(
              prisma,
              itx.guildId,
              itx.user.id,
              itx.createdAt,
              itx,
            );
            if (!snapshot) return;

            await itx.editReply(render(buildBirthday2026RankingView(snapshot)));
          }),
      ),
  )
  .group("urodziny-admin", (group) =>
    group
      .setDescription("Prywatne zarządzanie eventem urodzinowym 2026")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .setDMPermission(false)
      .addCommand("stan", (command) =>
        command
          .setDescription("Pokaż stan konfiguracji eventu")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const config = await findBirthday2026Config(prisma, itx.guildId);
            if (!config) {
              await itx.editReply("Event urodzinowy nie jest skonfigurowany.");
              return;
            }

            const [
              teams,
              disabledTextChannels,
              textDiagnostics,
              voiceDiagnostics,
              registrationCount,
              rosterFinalization,
            ] = await Promise.all([
              findBirthday2026Teams(prisma, itx.guildId),
              findBirthday2026DisabledTextChannels(prisma, itx.guildId),
              getBirthday2026TextEarningDiagnostics(prisma, itx.guildId),
              getBirthday2026VoiceEarningDiagnostics(prisma, itx.guildId),
              prisma.birthday2026Registration.count({
                where: { configId: config.id },
              }),
              prisma.birthday2026RosterFinalization.findUnique({
                where: { configId: config.id },
              }),
            ]);
            const now = new Date();
            const configuredTucznicy = teams.filter(
              (team) => team.identity !== null,
            ).length;
            const configuredPersonas = teams.filter(
              (team) => team.persona !== null,
            ).length;
            const tucznicyReady =
              teams.length === 4 &&
              configuredTucznicy === teams.length &&
              configuredPersonas === teams.length;
            const teamLines = teams.map(
              (team) =>
                `${roleMention(team.roleId)} — ${team._count.memberStates} os. — Tucznik: ${
                  team.identity
                    ? userMention(team.identity.tucznikUserId)
                    : "nie wyznaczono"
                } — kapitan: ${
                  team.identity
                    ? userMention(team.identity.captainUserId)
                    : "nie wyznaczono"
                } — persona: ${team.persona ? `${team.persona.fallbackEmoji} ${team.persona.title}` : "nie zatwierdzono"}`,
            );

            await itx.editReply({
              content: [
                `${bold("Stan eventu:")} ${getBirthday2026EventState(config, now)}`,
                `${bold("Zapisy:")} ${getBirthday2026RegistrationState(config, now)}`,
                `${bold("Zapisani / przydział:")} ${registrationCount} / ${
                  rosterFinalization
                    ? time(
                        rosterFinalization.finalizedAt,
                        TimestampStyles.ShortDateTime,
                      )
                    : "nie wykonano"
                }`,
                `${bold("Widoczny / aktywny:")} ${config.visible ? "tak" : "nie"} / ${
                  config.enabled ? "tak" : "nie"
                }`,
                `${bold("Start:")} ${time(config.eventStartAt, TimestampStyles.LongDateTime)}`,
                `${bold("Koniec:")} ${time(config.eventEndAt, TimestampStyles.LongDateTime)}`,
                `${bold("Strefa:")} ${config.timezone}`,
                `${bold("Tekst:")} ${
                  textDiagnostics
                    ? `okno=${textDiagnostics.windowSeconds}s, limit=${textDiagnostics.dailyCap}/dzień, wyłączone kanały=${disabledTextChannels?.length ?? 0}`
                    : "nie skonfigurowano"
                }`,
                `${bold("Naliczona Pasza tekstowa:")} ${textDiagnostics?.awardedTransactions ?? 0} — liczniki=${textDiagnostics?.counterTotal ?? 0}, dni użytkowników=${textDiagnostics?.dailyRows ?? 0}, spójne=${textDiagnostics?.reconciled ? "tak" : "NIE"}`,
                `${bold("Głos:")} ${
                  voiceDiagnostics
                    ? `jednostka=${voiceDiagnostics.unitSeconds}s, limit=${voiceDiagnostics.dailyCap}/dzień`
                    : "nie skonfigurowano"
                }`,
                `${bold("Naliczona Pasza głosowa:")} ${voiceDiagnostics?.awardedPasza ?? 0} w ${voiceDiagnostics?.awardedTransactions ?? 0} transakcjach — liczniki=${voiceDiagnostics?.counterTotal ?? 0}, dni użytkowników=${voiceDiagnostics?.dailyRows ?? 0}, spójne=${voiceDiagnostics?.reconciled ? "tak" : "NIE"}`,
                `${bold("Tucznicy:")} ${configuredTucznicy}/4 — gotowość: ${tucznicyReady ? "tak" : "nie"}`,
                `${bold("Drużyny:")}`,
                teamLines.join("\n") || "brak",
              ].join("\n"),
            });
          }),
      )
      .addCommand("konfiguruj", (command) =>
        command
          .setDescription("Ustaw daty i prywatne flagi eventu")
          .addString("start", (option) =>
            option.setDescription("Np. 2026-08-03T20:00:00+02:00"),
          )
          .addString("koniec", (option) =>
            option.setDescription("Np. 2026-08-10T20:00:00+02:00"),
          )
          .addString("strefa", (option) =>
            option.setDescription("Strefa IANA, np. Europe/Warsaw"),
          )
          .addBoolean("widoczny", (option) =>
            option.setDescription("Czy event jest widoczny"),
          )
          .addBoolean("aktywny", (option) =>
            option.setDescription("Czy mechaniki są aktywne"),
          )
          .addBoolean("zapisy", (option) =>
            option.setDescription("Czy zapisy są otwarte"),
          )
          .handle(
            async (
              { prisma },
              {
                start: rawStart,
                koniec: rawEnd,
                strefa: timezone,
                widoczny: visible,
                aktywny: enabled,
                zapisy: registrationEnabled,
              },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply({ flags: "Ephemeral" });

              const eventStartAt = parseBirthday2026Instant(rawStart);
              const eventEndAt = parseBirthday2026Instant(rawEnd);
              if (!eventStartAt || !eventEndAt) {
                await errorFollowUp(
                  itx,
                  "Daty muszą być pełnymi znacznikami ISO z offsetem, np. 2026-08-03T20:00:00+02:00.",
                );
                return;
              }

              const result = await upsertBirthday2026Config(prisma, {
                guildId: itx.guildId,
                eventStartAt,
                eventEndAt,
                timezone,
                visible,
                enabled,
                registrationEnabled,
              });
              if (!result.ok) {
                const messages = {
                  invalid_event_window:
                    "Koniec eventu musi przypadać po jego rozpoczęciu.",
                  invalid_timezone: "Nieprawidłowa strefa czasowa.",
                  roster_finalized:
                    "Nie można zmienić konfiguracji po przydzieleniu drużyn.",
                };
                await errorFollowUp(itx, messages[result.reason]);
                return;
              }

              await itx.editReply({
                content: `Skonfigurowano event: ${time(
                  result.config.eventStartAt,
                  TimestampStyles.LongDateTime,
                )} – ${time(result.config.eventEndAt, TimestampStyles.LongDateTime)}.`,
              });
            },
          ),
      )
      .addCommand("flagi", (command) =>
        command
          .setDescription("Zmień widoczność i dostępność eventu")
          .addBoolean("widoczny", (option) =>
            option.setDescription("Czy event jest widoczny").setRequired(false),
          )
          .addBoolean("aktywny", (option) =>
            option.setDescription("Czy mechaniki są aktywne").setRequired(false),
          )
          .addBoolean("zapisy", (option) =>
            option.setDescription("Czy zapisy są otwarte").setRequired(false),
          )
          .handle(
            async (
              { prisma },
              { widoczny: visible, aktywny: enabled, zapisy: registrationEnabled },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply({ flags: "Ephemeral" });

              if (
                visible === null &&
                enabled === null &&
                registrationEnabled === null
              ) {
                await errorFollowUp(itx, "Podaj przynajmniej jedną flagę do zmiany.");
                return;
              }
              if (!(await findBirthday2026Config(prisma, itx.guildId))) {
                await errorFollowUp(
                  itx,
                  "Najpierw skonfiguruj daty eventu komendą `konfiguruj`.",
                );
                return;
              }

              const result = await setBirthday2026FeatureState(prisma, itx.guildId, {
                ...(visible !== null ? { visible } : {}),
                ...(enabled !== null ? { enabled } : {}),
                ...(registrationEnabled !== null ? { registrationEnabled } : {}),
              });
              if (!result.ok) {
                await errorFollowUp(
                  itx,
                  "Nie można ponownie otworzyć zapisów po przydzieleniu drużyn.",
                );
                return;
              }
              await itx.editReply({
                content: `Flagi zapisane: widoczny=${result.config.visible}, aktywny=${result.config.enabled}, zapisy=${result.config.registrationEnabled}.`,
              });
            },
          ),
      )
      .addCommand("przydziel-zapisy", (command) =>
        command
          .setDescription("Przydziel zapisanych po zamknięciu zapisów")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const result = await finalizeBirthday2026Registration(
              prisma,
              itx.guildId,
              Math.random,
            );
            if (!result.ok) {
              await errorFollowUp(itx, finalizationErrorMessages[result.reason]);
              return;
            }

            const roleSync = await syncBirthday2026Roles(prisma, itx.guild);
            const teamLines = result.teams.map(
              (team) =>
                `${roleMention(team.roleId)} — ${team.memberCount} os. — prognoza ${team.projectedActivity.toFixed(1)}`,
            );
            await itx.editReply({
              content: [
                `Przydzielono ${result.assignments.length} uczestników.`,
                ...teamLines,
                `Role: ${roleSync.total - roleSync.failed}/${roleSync.total} zsynchronizowano${
                  roleSync.failed > 0
                    ? "; uruchom `synchronizuj-role`, aby ponowić błędy"
                    : ""
                }.`,
              ].join("\n"),
            });
          }),
      )
      .addCommand("synchronizuj-role", (command) =>
        command
          .setDescription("Zsynchronizuj role Discord z przydziałem drużyn")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const result = await syncBirthday2026Roles(prisma, itx.guild);
            await itx.editReply(
              `Role: ${result.total - result.failed}/${result.total} zsynchronizowano${
                result.failed > 0 ? `, błędy: ${result.failed}` : ""
              }.`,
            );
          }),
      )
      .addCommand("ekonomia", (command) =>
        command
          .setDescription("Skonfiguruj walutę i czas trawienia")
          .addString("nazwa", (option) =>
            option.setDescription("Nazwa waluty eventowej"),
          )
          .addString("symbol", (option) =>
            option.setDescription("Symbol waluty eventowej"),
          )
          .addInteger("trawienie-sekundy", (option) =>
            option.setDescription("Czas trawienia w sekundach").setMinValue(0),
          )
          .handle(
            async (
              { prisma },
              {
                nazwa: currencyName,
                symbol: currencySymbol,
                "trawienie-sekundy": digestionDelaySeconds,
              },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply({ flags: "Ephemeral" });
              await ensureUserExists(prisma, itx.user);

              const result = await setupBirthday2026Economy(prisma, {
                guildId: itx.guildId,
                currencyName,
                currencySymbol,
                digestionDelaySeconds,
                createdByUserId: itx.user.id,
              });
              if (!result.ok) {
                await replyWithEconomyError(itx, result.reason);
                return;
              }

              await itx.editReply(
                `Ekonomia skonfigurowana: waluta ${result.currencyId}, portfele drużyn: ${result.teamWalletCount}.`,
              );
            },
          ),
      )
      .addCommand("tekst", (command) =>
        command
          .setDescription("Skonfiguruj automatyczne zdobywanie Paszy za tekst")
          .addInteger("okno-minuty", (option) =>
            option.setDescription("Długość okna aktywności").setMinValue(1),
          )
          .addInteger("limit-dzienny", (option) =>
            option.setDescription("Maksymalna Pasza dziennie").setMinValue(1),
          )
          .handle(
            async (
              { prisma },
              { "okno-minuty": windowMinutes, "limit-dzienny": dailyCap },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply({ flags: "Ephemeral" });

              const result = await configureBirthday2026TextEarning(prisma, {
                guildId: itx.guildId,
                windowSeconds: windowMinutes * 60,
                dailyCap,
              });
              if (!result.ok) {
                const messages = {
                  config_not_found:
                    "Najpierw skonfiguruj daty eventu komendą `konfiguruj`.",
                  invalid_daily_cap:
                    "Limit dzienny musi być dodatnią liczbą całkowitą.",
                  invalid_window: "Okno aktywności musi być dodatnią liczbą minut.",
                  text_earning_already_used:
                    "Nie można zmienić reguł tekstowych po przyznaniu pierwszej Paszy.",
                };
                await errorFollowUp(itx, messages[result.reason]);
                return;
              }

              await itx.editReply(
                `Zdobywanie Paszy za tekst: okno ${windowMinutes} min, limit ${dailyCap} na dzień eventowy.`,
              );
            },
          ),
      )
      .addCommand("glos", (command) =>
        command
          .setDescription("Skonfiguruj automatyczne zdobywanie Paszy za głos")
          .addInteger("jednostka-minuty", (option) =>
            option.setDescription("Minuty aktywnego głosu na 1 Paszę").setMinValue(1),
          )
          .addInteger("limit-dzienny", (option) =>
            option.setDescription("Maksymalna Pasza dziennie").setMinValue(1),
          )
          .handle(
            async (
              { prisma },
              { "jednostka-minuty": unitMinutes, "limit-dzienny": dailyCap },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply({ flags: "Ephemeral" });

              const result = await configureBirthday2026VoiceEarning(prisma, {
                guildId: itx.guildId,
                unitSeconds: unitMinutes * 60,
                dailyCap,
              });
              if (!result.ok) {
                const messages = {
                  config_not_found:
                    "Najpierw skonfiguruj daty eventu komendą `konfiguruj`.",
                  invalid_daily_cap:
                    "Limit dzienny musi być dodatnią liczbą całkowitą.",
                  invalid_unit: "Jednostka głosowa musi być dodatnią liczbą minut.",
                  voice_earning_already_used:
                    "Nie można zmienić reguł głosowych po przyznaniu pierwszej Paszy.",
                };
                await errorFollowUp(itx, messages[result.reason]);
                return;
              }

              await itx.editReply(
                `Zdobywanie Paszy za głos: jednostka ${unitMinutes} min, limit ${dailyCap} na dzień eventowy.`,
              );
            },
          ),
      )
      .addCommand("progi", (command) =>
        command
          .setDescription("Ustaw cztery wspólne progi wagi")
          .addInteger("pierwszy", (option) =>
            option.setDescription("Pierwszy próg").setMinValue(1),
          )
          .addInteger("drugi", (option) =>
            option.setDescription("Drugi próg").setMinValue(1),
          )
          .addInteger("trzeci", (option) =>
            option.setDescription("Trzeci próg").setMinValue(1),
          )
          .addInteger("finalny", (option) =>
            option.setDescription("Próg formy finałowej").setMinValue(1),
          )
          .handle(async ({ prisma }, { pierwszy, drugi, trzeci, finalny }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });
            const result = await configureBirthday2026Milestones(prisma, itx.guildId, [
              pierwszy,
              drugi,
              trzeci,
              finalny,
            ]);
            if (!result.ok) {
              const messages = {
                config_not_found: "Najpierw skonfiguruj event.",
                event_enabled: "Wyłącz event przed ustawieniem progów.",
                invalid_thresholds: "Progi muszą być dodatnie i rosnąć bez powtórzeń.",
                milestones_already_configured:
                  "Progi są już skonfigurowane z innymi wartościami.",
              };
              await errorFollowUp(itx, messages[result.reason]);
              return;
            }
            await itx.editReply(
              `Ustawiono progi: ${result.milestones.map((milestone) => milestone.threshold).join(", ")}.`,
            );
          }),
      )
      .addCommand("persona", (command) =>
        command
          .setDescription("Zapisz zatwierdzoną personę Tucznika")
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .addString("tytul", (option) =>
            option.setDescription("Zatwierdzony tytuł persony"),
          )
          .addString("emoji", (option) =>
            option.setDescription("Awaryjne emoji persony"),
          )
          .handle(async ({ prisma }, { druzyna: role, tytul: title, emoji }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });
            await ensureUserExists(prisma, itx.user);
            const team = await findTeamByRole(prisma, itx.guildId, role.id);
            if (!team) {
              await errorFollowUp(itx, "Ta rola nie jest drużyną tego eventu.");
              return;
            }
            const result = await configureBirthday2026Persona(prisma, {
              guildId: itx.guildId,
              teamConfigId: team.id,
              title,
              fallbackEmoji: emoji,
              configuredByUserId: itx.user.id,
              consentedAt: itx.createdAt,
            });
            if (!result.ok) {
              const messages = {
                invalid_persona: "Tytuł i emoji nie mogą być puste.",
                team_not_found: "Nie znaleziono drużyny.",
                tucznik_not_configured: "Najpierw wyznacz Tucznika drużyny.",
              };
              await errorFollowUp(itx, messages[result.reason]);
              return;
            }
            await itx.editReply(
              `Zapisano zatwierdzoną personę ${result.persona.fallbackEmoji} ${result.persona.title}.`,
            );
          }),
      )
      .addCommand("grafika", (command) =>
        command
          .setDescription("Ustaw zatwierdzoną grafikę etapu Tucznika")
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .addInteger("etap", (option) =>
            option.setDescription("Etap od 0 do 4").setMinValue(0).setMaxValue(4),
          )
          .addString("url", (option) => option.setDescription("Adres HTTPS grafiki"))
          .handle(async ({ prisma }, { druzyna: role, etap, url }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });
            const team = await findTeamByRole(prisma, itx.guildId, role.id);
            if (!team) {
              await errorFollowUp(itx, "Ta rola nie jest drużyną tego eventu.");
              return;
            }
            const result = await configureBirthday2026Artwork(prisma, {
              guildId: itx.guildId,
              teamConfigId: team.id,
              milestonePosition: etap,
              imageUrl: url,
            });
            if (!result.ok) {
              const messages = {
                invalid_url: "Grafika musi mieć poprawny adres HTTPS.",
                milestone_not_found: "Najpierw skonfiguruj wskazany próg.",
                persona_not_configured: "Najpierw skonfiguruj personę Tucznika.",
                team_not_found: "Nie znaleziono drużyny.",
              };
              await errorFollowUp(itx, messages[result.reason]);
              return;
            }
            await itx.editReply("Zapisano grafikę etapu Tucznika.");
          }),
      )
      .addCommand("status-kanal", (command) =>
        command
          .setDescription("Utwórz lub odzyskaj kanoniczny status drużyny")
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .addChannel("kanal", (option) => option.setDescription("Kanał statusu"))
          .handle(async ({ prisma }, { druzyna: role, kanal }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });
            const team = await findTeamByRole(prisma, itx.guildId, role.id);
            if (!team) {
              await errorFollowUp(itx, "Ta rola nie jest drużyną tego eventu.");
              return;
            }
            const result = await reconcileBirthday2026StatusMessage(
              itx.client,
              prisma,
              team.id,
              kanal.id,
            );
            if (!result.ok) {
              const messages = {
                channel_not_sendable: "Bot nie może wysyłać wiadomości na tym kanale.",
                status_not_configured: "Nie wskazano kanału statusu.",
                status_not_ready:
                  "Skonfiguruj ekonomię, personę, Tucznika i portfel drużyny.",
                team_not_found: "Nie znaleziono drużyny.",
              };
              await errorFollowUp(itx, messages[result.reason]);
              return;
            }
            await itx.editReply(
              result.recreated
                ? "Utworzono kanoniczny status drużyny."
                : "Odświeżono kanoniczny status drużyny.",
            );
          }),
      )
      .addCommand("wylacz-kanal-tekst", (command) =>
        command
          .setDescription("Wyklucz kanał ze zdobywania Paszy za tekst")
          .addChannel("kanal", (option) =>
            option.setDescription("Kanał do wykluczenia"),
          )
          .handle(async ({ prisma }, { kanal: channel }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const result = await disableBirthday2026TextChannel(
              prisma,
              itx.guildId,
              channel.id,
            );
            if (!result.ok) {
              await errorFollowUp(
                itx,
                result.reason === "config_not_found"
                  ? "Event urodzinowy nie jest jeszcze skonfigurowany."
                  : result.reason === "text_earning_not_configured"
                    ? "Najpierw skonfiguruj zdobywanie Paszy za tekst."
                    : "Nieprawidłowy kanał.",
              );
              return;
            }

            await itx.editReply(
              `${channelMention(result.channelId)} ${
                result.changed ? "został wykluczony" : "był już wykluczony"
              } ze zdobywania Paszy.`,
            );
          }),
      )
      .addCommand("wlacz-kanal-tekst", (command) =>
        command
          .setDescription("Przywróć zdobywanie Paszy na kanale")
          .addChannel("kanal", (option) =>
            option.setDescription("Kanał do przywrócenia"),
          )
          .handle(async ({ prisma }, { kanal: channel }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const result = await enableBirthday2026TextChannel(
              prisma,
              itx.guildId,
              channel.id,
            );
            if (!result.ok) {
              await errorFollowUp(
                itx,
                result.reason === "config_not_found"
                  ? "Event urodzinowy nie jest jeszcze skonfigurowany."
                  : result.reason === "text_earning_not_configured"
                    ? "Najpierw skonfiguruj zdobywanie Paszy za tekst."
                    : "Nieprawidłowy kanał.",
              );
              return;
            }

            await itx.editReply(
              `${channelMention(result.channelId)} ${
                result.changed ? "został przywrócony" : "nie był wykluczony"
              }.`,
            );
          }),
      )
      .addCommand("wylaczone-kanaly-tekst", (command) =>
        command
          .setDescription("Pokaż kanały bez Paszy za tekst")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const channels = await findBirthday2026DisabledTextChannels(
              prisma,
              itx.guildId,
            );
            if (!channels) {
              await errorFollowUp(
                itx,
                "Event urodzinowy nie jest jeszcze skonfigurowany.",
              );
              return;
            }

            await itx.editReply(
              channels.length > 0
                ? channels
                    .map(
                      (channel) =>
                        `${channelMention(channel.channelId)} (${channel.channelId})`,
                    )
                    .join("\n")
                : "Brak wykluczonych kanałów.",
            );
          }),
      )
      .addCommand("daj-pasze", (command) =>
        command
          .setDescription("Przyznaj uczestnikowi audytowaną Paszę")
          .addUser("user", (option) => option.setDescription("Uczestnik eventu"))
          .addInteger("ilosc", (option) =>
            option.setDescription("Ilość Paszy").setMinValue(1),
          )
          .addString("powod", (option) =>
            option.setDescription("Powód przyznania Paszy"),
          )
          .handle(async ({ prisma }, { user, ilosc: amount, powod: reason }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });
            await ensureUserExists(prisma, itx.user);

            const result = await grantBirthday2026Pasza(prisma, {
              guildId: itx.guildId,
              userId: user.id,
              amount,
              sourceKey: itx.id,
              createdByUserId: itx.user.id,
              reason,
            });
            if (!result.ok) {
              await replyWithEconomyError(itx, result.reason);
              return;
            }

            await itx.editReply(
              `${result.created ? "Przyznano" : "To przyznanie było już zapisane:"} ${result.amount} Paszy dla ${userMention(result.userId)}. Saldo: ${result.walletBalance}.`,
            );
          }),
      )
      .addCommand("nakarm-test", (command) =>
        command
          .setDescription("Przetestuj karmienie świni uczestnika")
          .addUser("user", (option) => option.setDescription("Uczestnik eventu"))
          .addInteger("ilosc", (option) =>
            option.setDescription("Ilość Paszy").setMinValue(1),
          )
          .addString("powod", (option) =>
            option.setDescription("Powód testowego karmienia"),
          )
          .handle(
            async (
              { prisma, messageQueue },
              { user, ilosc: amount, powod: reason },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply({ flags: "Ephemeral" });

              const result = await feedBirthday2026Pig(prisma, {
                guildId: itx.guildId,
                userId: user.id,
                amount,
                sourceKey: itx.id,
                acceptedAt: itx.createdAt,
                reason,
                scheduleDigestion: (tx, batch) =>
                  messageQueue.push(
                    "birthday2026Digest",
                    { batchId: batch.id },
                    batch.digestAt,
                    batch.id.toString(),
                    tx,
                  ),
              });
              if (!result.ok) {
                await replyWithEconomyError(itx, result.reason);
                return;
              }
              await updateBirthday2026Status(itx.client, prisma, result.teamConfigId);

              await itx.editReply(
                `${result.created ? "Nakarmiono" : "To karmienie było już zapisane:"} ${result.batch.amount} Paszy. Saldo osoby: ${result.personalBalance}, w korycie: ${result.teamBalance}, trawienie ${time(result.batch.digestAt, TimestampStyles.RelativeTime)}.`,
              );
            },
          ),
      )
      .addCommand("status-ekonomii", (command) =>
        command
          .setDescription("Sprawdź wagę, koryta i spójność feed batchy")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const statuses = await getBirthday2026EconomyStatus(prisma, itx.guildId);
            if (!statuses) {
              await errorFollowUp(itx, "Ekonomia eventu nie jest skonfigurowana.");
              return;
            }

            await itx.editReply({
              content:
                statuses
                  .map(
                    (status) =>
                      `${bold(status.teamName)}: waga=${status.permanentWeight ?? "brak"}, koryto=${status.balance ?? "brak"}, batch=${status.unresolvedFeed ?? "brak"}, spójne=${status.reconciled ? "tak" : "NIE"}`,
                  )
                  .join("\n") || "Brak drużyn.",
            });
          }),
      )
      .addCommand("dodaj-druzyne", (command) =>
        command
          .setDescription("Dodaj drużynę należącą do eventu")
          .addString("nazwa", (option) => option.setDescription("Nazwa drużyny"))
          .addRole("rola", (option) => option.setDescription("Rola drużyny"))
          .addString("kolor", (option) =>
            option.setDescription("Sześciocyfrowy kolor hex, np. #ff8800"),
          )
          .handle(
            async ({ prisma }, { nazwa: name, rola: role, kolor: rawColor }, itx) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply({ flags: "Ephemeral" });

              const color = parseBirthday2026TeamColor(rawColor);
              if (color === null) {
                await errorFollowUp(
                  itx,
                  "Kolor musi mieć dokładnie sześć cyfr hex, np. `#ff8800`.",
                );
                return;
              }

              const result = await createBirthday2026Team(prisma, {
                guildId: itx.guildId,
                name,
                roleId: role.id,
                color,
              });
              if (!result.ok) {
                await replyWithTeamError(itx, result.reason);
                return;
              }

              await itx.editReply(
                `Dodano drużynę ${bold(result.team.team.name)} (${roleMention(role.id)}).`,
              );
            },
          ),
      )
      .addCommand("przypisz", (command) =>
        command
          .setDescription("Przypisz użytkownika do drużyny")
          .addUser("user", (option) => option.setDescription("Użytkownik"))
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .handle(async ({ prisma }, { user, druzyna: role }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const team = await findTeamByRole(prisma, itx.guildId, role.id);
            if (!team) {
              await errorFollowUp(itx, "Ta rola nie jest drużyną tego eventu.");
              return;
            }

            const targetMember = await itx.guild.members.fetch(user.id);
            await ensureUserExists(prisma, targetMember);
            const result = await assignBirthday2026Member(prisma, {
              guildId: itx.guildId,
              teamConfigId: team.id,
              userId: user.id,
            });

            if (!result.ok) {
              await replyWithTeamError(itx, result.reason);
              return;
            }

            const { previousRoleId } = result;
            if (previousRoleId && previousRoleId !== team.roleId) {
              await targetMember.roles.remove(
                previousRoleId,
                "Zmiana drużyny Birthday 2026",
              );
            }
            await targetMember.roles.add(team.roleId, "Przypisanie Birthday 2026");

            await itx.editReply(
              `Przypisano ${userMention(user.id)} do ${roleMention(team.roleId)}.`,
            );
          }),
      )
      .addCommand("usun-czlonka", (command) =>
        command
          .setDescription("Usuń użytkownika z drużyny")
          .addUser("user", (option) => option.setDescription("Użytkownik"))
          .handle(async ({ prisma }, { user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const targetMember = await itx.guild.members.fetch(user.id);

            const result = await removeBirthday2026Member(prisma, itx.guildId, user.id);
            if (!result.ok) {
              await replyWithTeamError(itx, result.reason);
              return;
            }

            await targetMember.roles.remove(
              result.member.teamConfig.roleId,
              "Usunięcie z Birthday 2026",
            );
            await itx.editReply(
              `Usunięto ${userMention(user.id)} z drużyny eventowej.`,
            );
          }),
      )
      .addCommand("kapitan", (command) =>
        command
          .setDescription("Wyznacz albo zastąp kapitana drużyny")
          .addUser("user", (option) => option.setDescription("Nowy kapitan"))
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .handle(async ({ prisma }, { user, druzyna: role }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const team = await findTeamByRole(prisma, itx.guildId, role.id);
            if (!team) {
              await errorFollowUp(itx, "Ta rola nie jest drużyną tego eventu.");
              return;
            }

            const result = await setBirthday2026Captain(
              prisma,
              itx.guildId,
              team.id,
              user.id,
            );
            if (!result.ok) {
              await replyWithTeamError(itx, result.reason);
              return;
            }

            await itx.editReply(
              `${userMention(user.id)} jest kapitanem ${roleMention(team.roleId)}.`,
            );
          }),
      )
      .addCommand("tucznik", (command) =>
        command
          .setDescription("Wyznacz albo zastąp Tucznika i ustaw go kapitanem")
          .addUser("user", (option) => option.setDescription("Nowy Tucznik"))
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .handle(async ({ prisma }, { user, druzyna: role }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });
            await ensureUserExists(prisma, itx.user);

            const team = await findTeamByRole(prisma, itx.guildId, role.id);
            if (!team) {
              await errorFollowUp(itx, "Ta rola nie jest drużyną tego eventu.");
              return;
            }

            const result = await setBirthday2026Tucznik(
              prisma,
              itx.guildId,
              team.id,
              user.id,
              itx.user.id,
            );
            if (!result.ok) {
              await replyWithTeamError(itx, result.reason);
              return;
            }

            await itx.editReply(
              `${userMention(user.id)} jest Tucznikiem i kapitanem ${roleMention(team.roleId)}.`,
            );
          }),
      )
      .addCommand("usun-tucznika", (command) =>
        command
          .setDescription("Usuń konfigurację Tucznika i kapitana drużyny")
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .handle(async ({ prisma }, { druzyna: role }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });
            await ensureUserExists(prisma, itx.user);

            const team = await findTeamByRole(prisma, itx.guildId, role.id);
            if (!team) {
              await errorFollowUp(itx, "Ta rola nie jest drużyną tego eventu.");
              return;
            }

            const result = await setBirthday2026Tucznik(
              prisma,
              itx.guildId,
              team.id,
              null,
              itx.user.id,
            );
            if (!result.ok) {
              await replyWithTeamError(itx, result.reason);
              return;
            }

            await itx.editReply(
              `Usunięto konfigurację Tucznika i kapitana drużyny ${roleMention(team.roleId)}.`,
            );
          }),
      ),
  )
  .handle("guildMessageCreate", async ({ prisma }, message) => {
    if (message.author.bot || message.system) return;

    await awardBirthday2026TextPasza(prisma, {
      guildId: message.guild.id,
      userId: message.author.id,
      channelId: message.channel.id,
      occurredAt: message.createdAt,
    });
  })
  .handle("buttonInteractionCreate", async ({ prisma, messageQueue }, itx) => {
    if (itx.customId !== BIRTHDAY_2026_FEED_ALL_CUSTOM_ID) return;
    if (!itx.inCachedGuild()) return;

    await itx.deferReply({ flags: "Ephemeral" });
    await ensureUserExists(prisma, itx.user);

    const before = await getPlayerSnapshotOrReply(
      prisma,
      itx.guildId,
      itx.user.id,
      itx.createdAt,
      itx,
    );
    if (!before) return;
    if (!before.membership) {
      await errorFollowUp(itx, economyErrorMessages.member_not_found);
      return;
    }
    if (before.balance <= 0) {
      await errorFollowUp(itx, economyErrorMessages.insufficient_balance);
      return;
    }

    const result = await feedBirthday2026Player(prisma, {
      guildId: itx.guildId,
      userId: itx.user.id,
      amount: before.balance,
      sourceKey: itx.id,
      acceptedAt: itx.createdAt,
      reason: "Birthday 2026 player feed",
      scheduleDigestion: (tx, batch) =>
        messageQueue.push(
          "birthday2026Digest",
          { batchId: batch.id },
          batch.digestAt,
          batch.id.toString(),
          tx,
        ),
    });
    if (!result.ok) {
      await errorFollowUp(itx, playerFeedErrorMessages[result.reason]);
      return;
    }
    await updateBirthday2026Status(itx.client, prisma, result.teamConfigId);

    const after = await getPlayerSnapshotOrReply(
      prisma,
      itx.guildId,
      itx.user.id,
      itx.createdAt,
      itx,
    );
    if (!after) return;

    await itx.editReply(
      render(
        buildBirthday2026FeedResultView(
          after,
          result.batch.amount,
          result.batch.digestAt,
        ),
      ),
    );
  });
