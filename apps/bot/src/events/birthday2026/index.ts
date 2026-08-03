import { Hashira } from "@hashira/core";
import { render } from "@hashira/jsx";
import {
  bold,
  channelMention,
  PermissionFlagsBits,
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
import { findBirthday2026Config, upsertBirthday2026Config } from "./configService";
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
import { parseBirthday2026Instant } from "./staffInput";
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

const economyErrorMessages: Record<Birthday2026EconomyErrorReason, string> = {
  config_not_found: "Event urodzinowy nie jest jeszcze skonfigurowany.",
  currency_conflict: "Nazwa albo symbol waluty są już używane na tym serwerze.",
  economy_already_configured: "Ekonomia jest już skonfigurowana z innymi wartościami.",
  economy_not_configured: "Najpierw skonfiguruj ekonomię eventu.",
  insufficient_balance: "Użytkownik nie ma wystarczającej ilości Paszy.",
  invalid_currency: "Nazwa i symbol waluty nie mogą być puste.",
  invalid_digestion_delay: "Czas trawienia musi być nieujemną liczbą sekund.",
  member_not_found: "Ten użytkownik nie należy do eventu.",
  team_wallet_not_found: "Drużyna nie ma poprawnie skonfigurowanego portfela.",
};

const publicErrorMessages: Record<Birthday2026PublicErrorReason, string> = {
  economy_not_configured: "Ekonomia eventu nie jest jeszcze gotowa.",
  event_not_available: "Event nie jest teraz dostępny.",
  teams_not_ready: "Drużyny i ich Tucznicy nie są jeszcze gotowi.",
};

type Birthday2026PlayerFeedErrorReason = Extract<
  FeedBirthday2026PlayerResult,
  { ok: false }
>["reason"];

const playerFeedErrorMessages: Record<Birthday2026PlayerFeedErrorReason, string> = {
  ...economyErrorMessages,
  event_not_available: "Event nie jest teraz dostępny.",
  event_not_open: "Karmienie jest dostępne tylko podczas trwania eventu.",
  teams_not_ready: "Drużyny i ich Tucznicy nie są jeszcze gotowi.",
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

export const birthday2026 = new Hashira({ name: "birthday2026" })
  .use(base)
  .group("tucznik", (group) =>
    group
      .setDescription("Nakarm Tucznika swojej drużyny")
      .setDMPermission(false)
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

            const [teams, disabledTextChannels, textDiagnostics] = await Promise.all([
              findBirthday2026Teams(prisma, itx.guildId),
              findBirthday2026DisabledTextChannels(prisma, itx.guildId),
              getBirthday2026TextEarningDiagnostics(prisma, itx.guildId),
            ]);
            const now = new Date();
            const configuredTucznicy = teams.filter((team) =>
              Boolean(team.identity?.tucznikUserId),
            ).length;
            const tucznicyReady =
              teams.length > 0 && configuredTucznicy === teams.length;
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
                }`,
            );

            await itx.editReply({
              content: [
                `${bold("Stan eventu:")} ${getBirthday2026EventState(config, now)}`,
                `${bold("Zapisy:")} ${getBirthday2026RegistrationState(config, now)}`,
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
                  "Daty muszą być pełnymi znacznikami ISO z offsetem, np. 2026-08-03T20:00:00+02:00.",
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
                await errorFollowUp(
                  itx,
                  result.reason === "invalid_timezone"
                    ? "Nieprawidłowa strefa czasowa."
                    : "Koniec eventu musi przypadać po jego rozpoczęciu.",
                );
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

            const config = await prisma.birthday2026Config.update({
              where: { guildId: itx.guildId },
              data: {
                ...(visible !== null ? { visible } : {}),
                ...(enabled !== null ? { enabled } : {}),
              },
            });
            await itx.editReply({
              content: `Flagi zapisane: widoczny=${config.visible}, aktywny=${config.enabled}.`,
            });
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
