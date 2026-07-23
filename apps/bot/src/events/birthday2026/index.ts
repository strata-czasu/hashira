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
import {
  Birthday2026ConfigValidationError,
  findBirthday2026Config,
  setBirthday2026FeatureState,
  upsertBirthday2026Config,
} from "./configService";
import {
  getBirthday2026EventState,
  getBirthday2026RegistrationState,
} from "./eventState";
import { parseBirthday2026Instant, parseBirthday2026TeamColor } from "./staffInput";
import {
  assignBirthday2026Member,
  Birthday2026TeamServiceError,
  createBirthday2026Team,
  findBirthday2026Membership,
  findBirthday2026Teams,
  isUniqueConstraintError,
  removeBirthday2026Member,
  setBirthday2026Captain,
} from "./teamService";

const teamErrorMessages: Record<Birthday2026TeamServiceError["code"], string> = {
  captain_already_assigned: "Ten użytkownik jest już kapitanem innej drużyny.",
  captain_move_requires_replacement:
    "Najpierw wyznacz zastępstwo albo usuń kapitana tej drużyny.",
  captain_not_member: "Kapitan musi należeć do wskazanej drużyny.",
  config_not_found: "Event urodzinowy nie jest jeszcze skonfigurowany.",
  invalid_activity_estimate: "Nie udało się obliczyć aktywności uczestnika.",
  member_not_found: "Ten użytkownik nie należy do żadnej drużyny.",
  no_teams: "Event nie ma jeszcze skonfigurowanych drużyn.",
  team_not_found: "Nie znaleziono wskazanej drużyny.",
};

const replyWithBirthday2026Error = async (
  itx: Parameters<typeof errorFollowUp>[0],
  error: unknown,
): Promise<boolean> => {
  if (error instanceof Birthday2026TeamServiceError) {
    await errorFollowUp(itx, teamErrorMessages[error.code]);
    return true;
  }
  if (error instanceof Birthday2026ConfigValidationError) {
    await errorFollowUp(
      itx,
      error.code === "invalid_timezone"
        ? "Nieprawidłowa strefa czasowa."
        : "Koniec eventu musi przypadać po jego rozpoczęciu.",
    );
    return true;
  }
  if (isUniqueConstraintError(error)) {
    await errorFollowUp(
      itx,
      "Ta rola albo drużyna jest już używana przez event urodzinowy.",
    );
    return true;
  }
  return false;
};

const findTeamByRole = async (
  prisma: Parameters<typeof findBirthday2026Teams>[0],
  guildId: string,
  roleId: string,
) => {
  const teams = await findBirthday2026Teams(prisma, guildId);
  return teams.find((team) => team.roleId === roleId) ?? null;
};

const requireBirthday2026Staff = async (
  itx: Parameters<typeof errorFollowUp>[0],
): Promise<boolean> => {
  if (itx.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
    return true;
  }
  await errorFollowUp(itx, "Ta komenda jest dostępna tylko dla administracji.");
  return false;
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
            if (!(await requireBirthday2026Staff(itx))) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const config = await findBirthday2026Config(prisma, itx.guildId);
            if (!config) {
              await itx.editReply("Event urodzinowy nie jest skonfigurowany.");
              return;
            }

            const teams = await findBirthday2026Teams(prisma, itx.guildId);
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
                `${bold("Stan eventu:")} ${getBirthday2026EventState(config)}`,
                `${bold("Zapisy:")} ${getBirthday2026RegistrationState(config)}`,
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
            option
              .setDescription("Strefa IANA; domyślnie Europe/Warsaw")
              .setRequired(false),
          )
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
              if (!(await requireBirthday2026Staff(itx))) return;
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

              try {
                const config = await upsertBirthday2026Config(prisma, {
                  guildId: itx.guildId,
                  eventStartAt,
                  eventEndAt,
                  ...(timezone ? { timezone } : {}),
                  ...(visible !== null ? { visible } : {}),
                  ...(enabled !== null ? { enabled } : {}),
                  ...(registrationEnabled !== null ? { registrationEnabled } : {}),
                });
                await itx.editReply({
                  content: `Skonfigurowano event: ${time(
                    config.eventStartAt,
                    TimestampStyles.LongDateTime,
                  )} – ${time(config.eventEndAt, TimestampStyles.LongDateTime)}.`,
                });
              } catch (error) {
                if (!(await replyWithBirthday2026Error(itx, error))) throw error;
              }
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
              if (!(await requireBirthday2026Staff(itx))) return;
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

              const config = await setBirthday2026FeatureState(prisma, itx.guildId, {
                ...(visible !== null ? { visible } : {}),
                ...(enabled !== null ? { enabled } : {}),
                ...(registrationEnabled !== null ? { registrationEnabled } : {}),
              });
              await itx.editReply({
                content: `Flagi zapisane: widoczny=${config.visible}, aktywny=${config.enabled}, zapisy=${config.registrationEnabled}.`,
              });
            },
          ),
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
              if (!(await requireBirthday2026Staff(itx))) return;
              await itx.deferReply({ flags: "Ephemeral" });

              const color = parseBirthday2026TeamColor(rawColor);
              if (color === null) {
                await errorFollowUp(
                  itx,
                  "Kolor musi mieć dokładnie sześć cyfr hex, np. `#ff8800`.",
                );
                return;
              }

              try {
                const team = await createBirthday2026Team(prisma, {
                  guildId: itx.guildId,
                  name,
                  roleId: role.id,
                  color,
                });
                await itx.editReply(
                  `Dodano drużynę ${bold(team.team.name)} (${roleMention(role.id)}).`,
                );
              } catch (error) {
                if (!(await replyWithBirthday2026Error(itx, error))) throw error;
              }
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
            if (!(await requireBirthday2026Staff(itx))) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const team = await findTeamByRole(prisma, itx.guildId, role.id);
            if (!team) {
              await errorFollowUp(itx, "Ta rola nie jest drużyną tego eventu.");
              return;
            }

            const targetMember = await itx.guild.members.fetch(user.id);
            await ensureUserExists(prisma, targetMember);
            const previousMembership = await findBirthday2026Membership(
              prisma,
              itx.guildId,
              user.id,
            );

            try {
              await assignBirthday2026Member(prisma, {
                guildId: itx.guildId,
                teamConfigId: team.id,
                userId: user.id,
              });
            } catch (error) {
              if (!(await replyWithBirthday2026Error(itx, error))) throw error;
              return;
            }

            const previousRoleId = previousMembership?.teamConfig.roleId;
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
            if (!(await requireBirthday2026Staff(itx))) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const membership = await findBirthday2026Membership(
              prisma,
              itx.guildId,
              user.id,
            );
            if (!membership) {
              await errorFollowUp(itx, "Ten użytkownik nie należy do drużyny.");
              return;
            }
            const targetMember = await itx.guild.members.fetch(user.id);

            try {
              await removeBirthday2026Member(prisma, itx.guildId, user.id);
            } catch (error) {
              if (!(await replyWithBirthday2026Error(itx, error))) throw error;
              return;
            }

            await targetMember.roles.remove(
              membership.teamConfig.roleId,
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
            if (!(await requireBirthday2026Staff(itx))) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const team = await findTeamByRole(prisma, itx.guildId, role.id);
            if (!team) {
              await errorFollowUp(itx, "Ta rola nie jest drużyną tego eventu.");
              return;
            }

            try {
              await setBirthday2026Captain(prisma, itx.guildId, team.id, user.id);
              await itx.editReply(
                `${userMention(user.id)} jest kapitanem ${roleMention(team.roleId)}.`,
              );
            } catch (error) {
              if (!(await replyWithBirthday2026Error(itx, error))) throw error;
            }
          }),
      )
      .addCommand("usun-kapitana", (command) =>
        command
          .setDescription("Usuń obecnego kapitana drużyny")
          .addRole("druzyna", (option) => option.setDescription("Rola drużyny"))
          .handle(async ({ prisma }, { druzyna: role }, itx) => {
            if (!itx.inCachedGuild()) return;
            if (!(await requireBirthday2026Staff(itx))) return;
            await itx.deferReply({ flags: "Ephemeral" });

            const team = await findTeamByRole(prisma, itx.guildId, role.id);
            if (!team) {
              await errorFollowUp(itx, "Ta rola nie jest drużyną tego eventu.");
              return;
            }

            await setBirthday2026Captain(prisma, itx.guildId, team.id, null);
            await itx.editReply(
              `Usunięto kapitana drużyny ${roleMention(team.roleId)}.`,
            );
          }),
      ),
  );
