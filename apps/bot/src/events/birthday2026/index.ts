import { Hashira } from "@hashira/core";
import {
  bold,
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
import { parseBirthday2026Instant } from "./staffInput";
import {
  assignBirthday2026Member,
  createBirthday2026Team,
  findBirthday2026Teams,
  removeBirthday2026Member,
  setBirthday2026Captain,
} from "./teamService";

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

            const teams = await findBirthday2026Teams(prisma, itx.guildId);
            const now = new Date();
            const teamLines = teams.map(
              (team) =>
                `${roleMention(team.roleId)} — ${team._count.memberStates} os. — kapitan: ${
                  team.captainUserId
                    ? userMention(team.captainUserId)
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
                await replyWithEconomyError(itx, result.reason);
                return;
              }

              await itx.editReply(
                `Ekonomia skonfigurowana: waluta ${result.currencyId}, portfele drużyn: ${result.teamWalletCount}.`,
              );
            },
          ),
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
      .addCommand("usun-kapitana", (command) =>
        command
          .setDescription("Usuń obecnego kapitana drużyny")
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .handle(async ({ prisma }, { druzyna: role }, itx) => {
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
              null,
            );
            if (!result.ok) {
              await errorFollowUp(itx, teamErrorMessages[result.reason]);
              return;
            }
            await itx.editReply(
              `Usunięto kapitana drużyny ${roleMention(team.roleId)}.`,
            );
          }),
      ),
  );
