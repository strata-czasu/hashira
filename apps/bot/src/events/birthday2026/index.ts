import { Hashira } from "@hashira/core";
import type { ExtendedPrismaClient, PrismaTransaction } from "@hashira/db";
import { render } from "@hashira/jsx";
import {
  bold,
  type Client,
  channelMention,
  type Guild,
  PermissionFlagsBits,
  type RepliableInteraction,
  roleMention,
  TimestampStyles,
  time,
  userMention,
} from "discord.js";
import { base } from "../../base";
import { ensureUserExists } from "../../util/ensureUsersExist";
import { errorFollowUp } from "../../util/errorFollowUp";
import { getColor } from "../../util/getColor";
import { parseChannelMentions } from "../../util/parseChannels";
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
  cancelBirthday2026Encounter,
  configureBirthday2026Encounters,
  enterBirthday2026Encounter,
  inspectBirthday2026Encounters,
  reconcileBirthday2026EncounterMessage,
  spawnBirthday2026Encounter,
} from "./encounterService";
import { BIRTHDAY_2026_ENCOUNTER_CUSTOM_ID } from "./encounterView";
import {
  getBirthday2026EventState,
  getBirthday2026RegistrationState,
} from "./eventState";
import {
  finalizeBirthday2026Event,
  getBirthday2026FinalizationDiagnostics,
  getBirthday2026Results,
} from "./finalizationService";
import {
  type Birthday2026PlayerFeedErrorReason,
  type Birthday2026PublicErrorReason,
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
import { parseBirthday2026Instant } from "./staffInput";
import {
  configureBirthday2026Artwork,
  configureBirthday2026Milestones,
  configureBirthday2026Persona,
  reconcileBirthday2026StatusMessage,
} from "./statusService";
import {
  assignBirthday2026Member,
  createBirthday2026Team,
  createBirthday2026TeamIdentity,
  findBirthday2026Teams,
  removeBirthday2026Member,
  setBirthday2026Captain,
  setBirthday2026Tucznik,
} from "./teamService";
import {
  awardBirthday2026TextPasza,
  configureBirthday2026TextEarning,
  disableBirthday2026TextChannels,
  enableBirthday2026TextChannels,
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
    "Najpierw wyznacz zastępstwo kapitana tej drużyny.",
  captain_not_member: "Kapitan musi należeć do wskazanej drużyny.",
  config_not_found: "Event urodzinowy nie jest jeszcze skonfigurowany.",
  identity_already_assigned:
    "Tucznik albo kapitan jest już przypisany do innej drużyny.",
  identity_already_configured:
    "Tucznik i kapitan tej drużyny są już ustawieni. Zmieniaj ich osobno.",
  identity_not_configured: "Najpierw ustaw Tucznika i kapitana tej drużyny razem.",
  invalid_activity_estimate: "Nie udało się obliczyć aktywności uczestnika.",
  member_not_found: "Ten użytkownik nie należy do żadnej drużyny.",
  no_teams: "Event nie ma jeszcze skonfigurowanych drużyn.",
  role_already_used: "Ta rola jest już używana przez drużynę eventową.",
  team_already_exists: "Drużyna o tej nazwie już istnieje na serwerze.",
  team_not_found: "Nie znaleziono wskazanej drużyny.",
  tucznik_already_assigned: "Ten użytkownik jest już Tucznikiem innej drużyny.",
  tucznik_move_requires_replacement:
    "Najpierw wyznacz innego Tucznika dla tej drużyny.",
  tucznik_not_member: "Tucznik musi należeć do wskazanej drużyny.",
};

const economyErrorMessages = {
  config_not_found: "Event urodzinowy nie jest jeszcze skonfigurowany.",
  currency_conflict: "Nazwa albo symbol waluty są już używane na tym serwerze.",
  economy_already_configured: "Ekonomia jest już skonfigurowana z innymi wartościami.",
  economy_not_configured: "Najpierw skonfiguruj ekonomię eventu.",
  event_not_open: "Karmienie jest dostępne tylko podczas trwania eventu.",
  event_settled: "Event został już rozliczony.",
  insufficient_balance: "Użytkownik nie ma wystarczającej ilości Paszy.",
  invalid_currency: "Nazwa i symbol waluty nie mogą być puste.",
  invalid_digestion_delay: "Czas trawienia musi być nieujemną liczbą sekund.",
  member_not_found: "Ten użytkownik nie należy do eventu.",
  team_wallet_not_found: "Drużyna nie ma poprawnie skonfigurowanego portfela.",
} satisfies Record<Birthday2026EconomyErrorReason, string>;

const publicErrorMessages = {
  economy_not_configured: "Ekonomia eventu nie jest jeszcze gotowa.",
  event_not_available: "Event nie jest teraz dostępny.",
  teams_not_ready: "Drużyny, ich Tucznicy i persony nie są jeszcze gotowi.",
} satisfies Record<Birthday2026PublicErrorReason, string>;

const playerFeedErrorMessages = {
  ...economyErrorMessages,
  event_not_available: "Event nie jest teraz dostępny.",
  event_not_open: "Karmienie jest dostępne tylko podczas trwania eventu.",
  teams_not_ready: "Drużyny, ich Tucznicy i persony nie są jeszcze gotowi.",
} satisfies Record<Birthday2026PlayerFeedErrorReason, string>;

const registrationErrorMessages = {
  already_assigned: "Jesteś już przypisany do drużyny eventowej.",
  already_registered: "Jesteś już zapisany do eventu.",
  event_not_available: "Event nie jest teraz dostępny.",
  not_registered: "Nie jesteś zapisany do eventu.",
  registration_closed: "Event już się zakończył.",
  teams_not_ready:
    "Wszystkie drużyny muszą najpierw mieć swoich Tuczników i zatwierdzone persony.",
};

const finalizationErrorMessages = {
  already_finalized: "Drużyny zostały już przydzielone.",
  config_not_found: "Event urodzinowy nie jest jeszcze skonfigurowany.",
  earning_not_configured: "Najpierw skonfiguruj zdobywanie Paszy za tekst i głos.",
  event_enabled: "Wyłącz event przed przydzieleniem drużyn.",
  teams_not_ready:
    "Skonfiguruj co najmniej jedną drużynę, jej Tucznika i zatwierdzoną personę.",
};

const getPlayerSnapshotOrReply = async (
  prisma: PrismaTransaction,
  guildId: string,
  userId: string,
  now: Date,
  itx: RepliableInteraction,
) => {
  const result = await getBirthday2026PlayerSnapshot(prisma, guildId, userId, now);
  if (!result.ok) {
    await errorFollowUp(itx, publicErrorMessages[result.reason]);
    return null;
  }
  return result.snapshot;
};
const findTeamByRole = async (
  prisma: PrismaTransaction,
  guildId: string,
  roleId: string,
) => {
  const teams = await findBirthday2026Teams(prisma, guildId);
  return teams.find((team) => team.roleId === roleId) ?? null;
};

const syncBirthday2026Roles = async (prisma: ExtendedPrismaClient, guild: Guild) => {
  const { assignments } = await findBirthday2026RoleAssignments(prisma, guild.id);

  const results = await Promise.allSettled(
    assignments.map(async (assignment) => {
      const member = await guild.members.fetch(assignment.userId);
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
  prisma: ExtendedPrismaClient,
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
              Math.random,
            );
            if (!result.ok) {
              await errorFollowUp(itx, registrationErrorMessages[result.reason]);
              return;
            }
            if (!result.assigned) {
              await itx.editReply(
                "Zapisano Cię do eventu. Drużynę otrzymasz przy początkowym przydziale.",
              );
              return;
            }

            let roleAssigned = true;
            try {
              await itx.member.roles.add(result.roleId);
            } catch (error) {
              roleAssigned = false;
              console.warn("Failed to assign Birthday 2026 team role", error);
            }
            await itx.editReply(
              `Dołączasz do ${roleMention(result.roleId)}.${
                roleAssigned
                  ? " Rola została nadana."
                  : " Nie udało się nadać roli; administracja może uruchomić synchronizację."
              }`,
            );
          }),
      )
      .addCommand("zrezygnuj", (command) =>
        command
          .setDescription("Wycofaj zapis przed przydzieleniem drużyny")
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
      )
      .addCommand("wyniki", (command) =>
        command
          .setDescription("Pokaż ostateczne wyniki eventu")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const settlement = await getBirthday2026Results(prisma, itx.guildId);
            if (!settlement) {
              await itx.editReply("Event nie został jeszcze ostatecznie rozliczony.");
              return;
            }
            const teamLines = settlement.teamResults.map(
              (result) =>
                `${result.rank}. ${roleMention(result.teamConfig.roleId)} — ${result.permanentWeight.toLocaleString("pl-PL")} stałej wagi — ${result.contributorCount} karmiących`,
            );
            const awardLines = settlement.individualResults.map(
              (result) =>
                `Najwięcej przekazanej Paszy: ${userMention(result.userId)} — ${result.amount.toLocaleString("pl-PL")}`,
            );
            await itx.editReply({
              content: [
                `${bold("Ostateczne wyniki Birthday 2026")}`,
                ...teamLines,
                ...(awardLines.length > 0
                  ? ["", bold("Wyróżnienia indywidualne"), ...awardLines]
                  : []),
                "",
                "Remisy rozstrzyga liczba karmiących, a następnie kolejność utworzenia drużyn.",
              ].join("\n"),
            });
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

            const now = new Date();
            const [
              teams,
              disabledTextChannels,
              textDiagnostics,
              voiceDiagnostics,
              registrationCount,
              rosterFinalization,
              settlementDiagnostics,
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
              getBirthday2026FinalizationDiagnostics(prisma, itx.guildId, now),
            ]);
            const configuredTucznicy = teams.filter((team) =>
              Boolean(team.identity?.tucznikUserId),
            ).length;
            const configuredPersonas = teams.filter(
              (team) => team.persona !== null,
            ).length;
            const tucznicyReady =
              teams.length > 0 &&
              configuredTucznicy === teams.length &&
              configuredPersonas === teams.length;
            const teamLines = teams.map(
              (team) =>
                `${roleMention(team.roleId)} — ${team._count.memberStates} os. — Tucznik: ${
                  team.identity?.tucznikUserId
                    ? userMention(team.identity.tucznikUserId)
                    : "nie wyznaczono"
                } — kapitan: ${
                  team.identity?.captainUserId
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
                `${bold("Rozliczenie:")} ${
                  settlementDiagnostics?.settledAt
                    ? time(
                        settlementDiagnostics.settledAt,
                        TimestampStyles.ShortDateTime,
                      )
                    : "nie wykonano"
                } — oczekujące batche=${settlementDiagnostics?.pendingBatchCount ?? 0}, Pasza=${settlementDiagnostics?.pendingPasza ?? 0}, przeterminowane=${settlementDiagnostics?.overdueBatchCount ?? 0}, bez zadania=${settlementDiagnostics?.missingTaskCount ?? 0}`,
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
                `${bold("Tucznicy:")} ${configuredTucznicy}/${teams.length} — gotowość: ${tucznicyReady ? "tak" : "nie"}`,
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
            option.setDescription("Np. 2026-08-01T20:00:00+02:00"),
          )
          .addString("koniec", (option) =>
            option.setDescription("Np. 2026-08-08T20:00:00+02:00"),
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
          .handle(
            async (
              { prisma },
              {
                start: rawStart,
                koniec: rawEnd,
                strefa: timezone,
                widoczny: visible,
                aktywny: enabled,
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
                  "Daty muszą być pełnymi znacznikami ISO z offsetem, np. 2026-08-01T20:00:00+02:00.",
                );
                return;
              }

              const result = await upsertBirthday2026Config(prisma, {
                guildId: itx.guildId,
                eventStartAt,
                eventEndAt,
                timezone: timezone.trim(),
                visible,
                enabled,
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
          .handle(async ({ prisma }, { widoczny: visible, aktywny: enabled }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            if (visible === null && enabled === null) {
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
            });
            if (!result.ok) {
              await errorFollowUp(
                itx,
                {
                  config_not_found: "Event nie jest skonfigurowany.",
                  event_settled: "Nie można wznowić rozliczonego eventu.",
                }[result.reason],
              );
              return;
            }
            await itx.editReply({
              content: `Flagi zapisane: widoczny=${result.config.visible}, aktywny=${result.config.enabled}.`,
            });
          }),
      )
      .addCommand("przydziel-zapisy", (command) =>
        command
          .setDescription("Wykonaj początkowy przydział zapisanych")
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
                await errorFollowUp(itx, economyErrorMessages[result.reason]);
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
      .addCommand("wydarzenia", (command) =>
        command
          .setDescription("Skonfiguruj szybkie wydarzenia")
          .addChannel("kanal", (option) => option.setDescription("Kanał wydarzeń"))
          .addInteger("okno-sekundy", (option) =>
            option.setDescription("Czas na udział").setMinValue(1),
          )
          .addInteger("odstep-minuty", (option) =>
            option.setDescription("Przerwa między wydarzeniami").setMinValue(1),
          )
          .addInteger("nagroda", (option) =>
            option.setDescription("Pasza za szybkie kliknięcie").setMinValue(1),
          )
          .addInteger("limit-wygranych", (option) =>
            option.setDescription("Limit wygranych na osobę").setMinValue(1),
          )
          .addInteger("prog-druzyny", (option) =>
            option.setDescription("Liczba różnych osób w drużynie").setMinValue(1),
          )
          .addInteger("nagroda-druzyny", (option) =>
            option.setDescription("Stała waga za próg drużynowy").setMinValue(1),
          )
          .handle(
            async (
              { prisma },
              {
                kanal,
                "okno-sekundy": responseWindowSeconds,
                "odstep-minuty": spawnIntervalMinutes,
                nagroda: individualReward,
                "limit-wygranych": winCap,
                "prog-druzyny": teamThreshold,
                "nagroda-druzyny": teamReward,
              },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await itx.deferReply({ flags: "Ephemeral" });
              const result = await configureBirthday2026Encounters(prisma, {
                guildId: itx.guildId,
                channelId: kanal.id,
                responseWindowSeconds,
                spawnIntervalSeconds: spawnIntervalMinutes * 60,
                individualReward,
                winCap,
                teamThreshold,
                teamReward,
              });
              if (!result.ok) {
                await errorFollowUp(
                  itx,
                  {
                    config_not_found: "Najpierw skonfiguruj event.",
                    event_settled: "Event został już rozliczony.",
                    invalid_config: "Wszystkie wartości muszą być dodatnie.",
                  }[result.reason],
                );
                return;
              }
              await itx.editReply("Skonfigurowano szybkie wydarzenia.");
            },
          ),
      )
      .addCommand("wymus-wydarzenie", (command) =>
        command
          .setDescription("Uruchom wydarzenie natychmiast")
          .addString("rodzaj", (option) =>
            option
              .setDescription("Rodzaj wydarzenia")
              .addChoices(
                { name: "Szybkie kliknięcie", value: "quickGrab" },
                { name: "Próg drużynowy", value: "teamThreshold" },
              ),
          )
          .handle(async ({ prisma, messageQueue }, { rodzaj: kind }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });
            const result = await spawnBirthday2026Encounter(prisma, {
              guildId: itx.guildId,
              kind: kind === "quickGrab" ? "quickGrab" : "teamThreshold",
              sourceKey: itx.id,
              startsAt: itx.createdAt,
              scheduleJob: (tx, type, encounterId, handleAfter) =>
                messageQueue.push(
                  type,
                  { encounterId },
                  handleAfter,
                  `${type}:${encounterId}`,
                  tx,
                ),
            });
            if (!result.ok) {
              const messages = {
                config_not_found: "Event nie jest skonfigurowany.",
                encounter_active: "Inne wydarzenie nadal trwa.",
                encounters_not_configured: "Najpierw skonfiguruj wydarzenia.",
                event_not_open: "Event nie jest teraz aktywny.",
                event_settled: "Event został już rozliczony.",
                invalid_source_key: "Brak identyfikatora wydarzenia.",
              };
              await errorFollowUp(itx, messages[result.reason]);
              return;
            }
            const message = await reconcileBirthday2026EncounterMessage(
              itx.client,
              prisma,
              result.encounter.id,
              itx.createdAt,
            );
            if (!message.ok) {
              await errorFollowUp(itx, "Nie udało się wysłać wiadomości wydarzenia.");
              return;
            }
            await itx.editReply(`Uruchomiono wydarzenie #${result.encounter.id}.`);
          }),
      )
      .addCommand("anuluj-wydarzenie", (command) =>
        command
          .setDescription("Anuluj aktywne wydarzenie")
          .addInteger("id", (option) =>
            option.setDescription("Identyfikator wydarzenia").setMinValue(1),
          )
          .handle(async ({ prisma }, { id }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });
            const result = await cancelBirthday2026Encounter(
              prisma,
              itx.guildId,
              id,
              itx.createdAt,
            );
            if (result.count === 0) {
              await errorFollowUp(
                itx,
                "Wydarzenie nie istnieje albo już się skończyło.",
              );
              return;
            }
            await reconcileBirthday2026EncounterMessage(
              itx.client,
              prisma,
              id,
              itx.createdAt,
            );
            await itx.editReply(`Anulowano wydarzenie #${id}.`);
          }),
      )
      .addCommand("wydarzenia-stan", (command) =>
        command
          .setDescription("Pokaż ostatnie wydarzenia")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });
            const encounters = await inspectBirthday2026Encounters(prisma, itx.guildId);
            await itx.editReply(
              encounters.length > 0
                ? encounters
                    .map(
                      (encounter) =>
                        `#${encounter.id} ${encounter.kind} — wejścia=${encounter._count.entries}, zwycięzca=${encounter.winner ? userMention(encounter.winner.userId) : "brak"}, drużyny=${encounter.teamCompletions.length}, wiadomość=${encounter.message ? "tak" : "nie"}`,
                    )
                    .join("\n")
                : "Brak wydarzeń.",
            );
          }),
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
          .addString("kanaly", (option) =>
            option.setDescription("Kanały do wykluczenia"),
          )
          .handle(async ({ prisma }, { kanaly: rawChannels }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const channelIds = parseChannelMentions(rawChannels);
            if (channelIds.length === 0) {
              await errorFollowUp(itx, "Podaj co najmniej jeden kanał.");
              return;
            }

            const result = await disableBirthday2026TextChannels(
              prisma,
              itx.guildId,
              channelIds,
            );
            if (!result.ok) {
              await errorFollowUp(
                itx,
                result.reason === "config_not_found"
                  ? "Event urodzinowy nie jest jeszcze skonfigurowany."
                  : "Najpierw skonfiguruj zdobywanie Paszy za tekst.",
              );
              return;
            }

            await itx.editReply(
              `${result.channelIds.map(channelMention).join(", ")} ${
                result.changed ? "zostały wykluczone" : "były już wykluczone"
              } ze zdobywania Paszy.`,
            );
          }),
      )
      .addCommand("wlacz-kanal-tekst", (command) =>
        command
          .setDescription("Przywróć zdobywanie Paszy na kanale")
          .addString("kanaly", (option) =>
            option.setDescription("Kanały do przywrócenia"),
          )
          .handle(async ({ prisma }, { kanaly: rawChannels }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const channelIds = parseChannelMentions(rawChannels);
            if (channelIds.length === 0) {
              await errorFollowUp(itx, "Podaj co najmniej jeden kanał.");
              return;
            }

            const result = await enableBirthday2026TextChannels(
              prisma,
              itx.guildId,
              channelIds,
            );
            if (!result.ok) {
              await errorFollowUp(
                itx,
                result.reason === "config_not_found"
                  ? "Event urodzinowy nie jest jeszcze skonfigurowany."
                  : "Najpierw skonfiguruj zdobywanie Paszy za tekst.",
              );
              return;
            }

            await itx.editReply(
              `${result.channelIds.map(channelMention).join(", ")} ${
                result.changed ? "zostały przywrócone" : "nie były wykluczone"
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
      ),
  )
  .group("urodziny-ops", (group) =>
    group
      .setDescription("Bieżąca obsługa eventu urodzinowego 2026")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .setDMPermission(false)
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
              await errorFollowUp(itx, economyErrorMessages[result.reason]);
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
                await errorFollowUp(itx, economyErrorMessages[result.reason]);
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
      .addCommand("rozlicz", (command) =>
        command
          .setDescription("Zablokuj wynik i rozlicz event")
          .addBoolean("potwierdz", (option) =>
            option.setDescription("Potwierdzam ostateczne rozliczenie"),
          )
          .handle(async ({ prisma }, { potwierdz: confirmed }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });
            if (!confirmed) {
              await errorFollowUp(itx, "Rozliczenie wymaga potwierdzenia.");
              return;
            }
            await ensureUserExists(prisma, itx.user);

            const result = await finalizeBirthday2026Event(prisma, {
              guildId: itx.guildId,
              settledAt: itx.createdAt,
              settledByUserId: itx.user.id,
            });
            if (!result.ok) {
              const messages = {
                config_not_found: "Event nie jest skonfigurowany.",
                economy_not_configured: "Ekonomia eventu nie jest skonfigurowana.",
                event_open:
                  "Event nadal trwa. Poczekaj do końca albo najpierw wyłącz go flagą `aktywny`.",
                personal_wallet_balance_mismatch:
                  "Saldo osobiste zmieniło się podczas rozliczenia. Spróbuj ponownie.",
                team_wallet_balance_mismatch:
                  "Koryto nie zgadza się z oczekującymi batchami. Sprawdź `status-ekonomii`.",
                teams_not_ready: "Drużyny i ich portfele nie są gotowe.",
              };
              await errorFollowUp(itx, messages[result.reason]);
              return;
            }

            await Promise.all(
              result.settlement.teamResults.map((team) =>
                updateBirthday2026Status(itx.client, prisma, team.teamConfigId),
              ),
            );
            const winner = result.settlement.teamResults.at(0);
            await itx.editReply(
              `${result.created ? "Rozliczono" : "Event był już rozliczony"}. Zwycięzca: ${winner ? roleMention(winner.teamConfig.roleId) : "brak"}. Przetrawiono ${result.settlement.digestedPendingPasza} oczekującej Paszy, wygaszono ${result.settlement.discardedPersonalPasza} niewykorzystanej Paszy.`,
            );
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

              const color = getColor(rawColor.trim());
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
                await errorFollowUp(itx, teamErrorMessages[result.reason]);
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
              await errorFollowUp(itx, teamErrorMessages[result.reason]);
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
              await errorFollowUp(itx, teamErrorMessages[result.reason]);
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
      .addCommand("tozsamosc", (command) =>
        command
          .setDescription("Ustaw Tucznika i kapitana drużyny")
          .addUser("tucznik", (option) => option.setDescription("Tucznik"))
          .addUser("kapitan", (option) => option.setDescription("Kapitan"))
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .handle(async ({ prisma }, { tucznik, kapitan, druzyna: role }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const team = await findTeamByRole(prisma, itx.guildId, role.id);
            if (!team) {
              await errorFollowUp(itx, "Ta rola nie jest drużyną tego eventu.");
              return;
            }

            const result = await createBirthday2026TeamIdentity(
              prisma,
              itx.guildId,
              team.id,
              {
                captainUserId: kapitan.id,
                tucznikUserId: tucznik.id,
              },
            );
            if (!result.ok) {
              await errorFollowUp(itx, teamErrorMessages[result.reason]);
              return;
            }

            await itx.editReply(
              `${userMention(tucznik.id)} jest Tucznikiem, a ${userMention(kapitan.id)} kapitanem ${roleMention(team.roleId)}.`,
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
              await errorFollowUp(itx, teamErrorMessages[result.reason]);
              return;
            }

            await itx.editReply(
              `${userMention(user.id)} jest kapitanem ${roleMention(team.roleId)}.`,
            );
          }),
      )
      .addCommand("tucznik", (command) =>
        command
          .setDescription("Wyznacz albo zastąp Tucznika")
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
              await errorFollowUp(itx, teamErrorMessages[result.reason]);
              return;
            }

            await itx.editReply(
              `${userMention(user.id)} jest Tucznikiem ${roleMention(team.roleId)}.`,
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
    if (itx.customId.startsWith(`${BIRTHDAY_2026_ENCOUNTER_CUSTOM_ID}:`)) {
      if (!itx.inCachedGuild()) return;
      const encounterId = Number(itx.customId.split(":").at(1));
      if (!Number.isSafeInteger(encounterId) || encounterId <= 0) return;
      await itx.deferReply({ flags: "Ephemeral" });
      await ensureUserExists(prisma, itx.user);
      const result = await enterBirthday2026Encounter(prisma, {
        encounterId,
        guildId: itx.guildId,
        userId: itx.user.id,
        enteredAt: itx.createdAt,
      });
      if (!result.ok) {
        const messages = {
          already_entered: "Twój udział jest już zapisany.",
          encounter_not_found: "Nie znaleziono wydarzenia.",
          encounter_not_open: "To wydarzenie już się zakończyło.",
          encounters_not_configured: "Wydarzenia nie są skonfigurowane.",
          event_settled: "Event został już rozliczony.",
          member_not_found: "Nie należysz do drużyny eventowej.",
          team_wallet_not_found: "Drużyna nie ma portfela eventowego.",
          win_cap_reached: "Osiągnąłeś limit zwycięstw.",
        };
        await errorFollowUp(itx, messages[result.reason]);
        return;
      }
      await reconcileBirthday2026EncounterMessage(
        itx.client,
        prisma,
        encounterId,
        itx.createdAt,
      );
      if (result.status === "completed") {
        await updateBirthday2026Status(itx.client, prisma, result.teamConfigId);
      }
      const replies = {
        already_completed: "Twój udział zapisano; drużyna już odebrała nagrodę.",
        completed: `Próg osiągnięty! Drużyna zdobywa ${result.reward} stałej wagi.`,
        progress: `Udział zapisany: ${result.progress}/${result.threshold}.`,
        won: `Wygrywasz ${result.reward} Paszy! Saldo: ${result.walletBalance}.`,
      };
      await itx.editReply(replies[result.status]);
      return;
    }
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
