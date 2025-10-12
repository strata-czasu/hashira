import { ConfirmationDialog, Hashira } from "@hashira/core";
import { addDays, addMonths, addWeeks, addYears } from "date-fns";
import {
  type ColorResolvable,
  inlineCode,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  type RoleColorsResolvable,
  resolveColor,
  time,
} from "discord.js";
import { base } from "../base";
import { discordTry } from "../util/discordTry";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";

const preprocessColor = (color: string): `#${string}` => {
  if (color.startsWith("#")) {
    return color as `#${string}`;
  }
  return `#${color}`;
};

const getColor = (rawColor: ColorResolvable | string) => {
  const color = typeof rawColor === "string" ? preprocessColor(rawColor) : rawColor;
  try {
    return resolveColor(color);
  } catch (_) {
    return null;
  }
};

const readExpiration = (expiration: string): Date | null => {
  const now = new Date();

  switch (expiration) {
    case "1d":
      return addDays(now, 1);
    case "1w":
      return addWeeks(now, 1);
    case "1m":
      return addMonths(now, 1);
    case "3m":
      return addMonths(now, 3);
    case "6m":
      return addMonths(now, 6);
    case "1y":
      return addYears(now, 1);
    default:
      return null;
  }
};

export const colorRoles = new Hashira({ name: "color-role" })
  .use(base)
  .group("kolorki", (group) =>
    group
      .setDescription("Zarządzaj swoimi kolorkami")
      .addCommand("dodaj", (command) =>
        command
          .setDescription("[MODERACYJNE] Dodaj nowy kolor")
          .addString("nazwa", (name) => name.setDescription("Nazwa koloru"))
          .addUser("właściciel", (owner) => owner.setDescription("Właściciel koloru"))
          .addString("wygaśnięcie", (expiration) =>
            expiration
              .setDescription("Czas po którym kolor wygaśnie")
              .addChoices(
                { name: "Bez wygaśnięcia", value: "0" },
                { name: "1 dzień", value: "1d" },
                { name: "1 tydzień", value: "1w" },
                { name: "1 miesiąc", value: "1m" },
                { name: "3 miesiące", value: "3m" },
                { name: "6 miesięcy", value: "6m" },
                { name: "1 rok", value: "1y" },
              ),
          )
          .addInteger("sloty", (slots) =>
            slots.setDescription("Ilość slotów na użytkowników").addChoices(
              {
                name: "1",
                value: 1,
              },
              { name: "10", value: 10 },
            ),
          )
          .addBoolean("gradient", (gradient) =>
            gradient.setDescription("Czy kolor roli może używać gradientów"),
          )
          .handle(
            async (
              { prisma },
              {
                nazwa: name,
                właściciel: owner,
                wygaśnięcie: rawExpiration,
                sloty: slots,
                gradient,
              },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              if (!itx.memberPermissions.has(PermissionFlagsBits.ManageRoles)) return;
              await itx.deferReply();

              const expiration = readExpiration(rawExpiration);

              const role = await discordTry(
                () => itx.guild.roles.create({ name, color: 0x000000 }),
                [
                  RESTJSONErrorCodes.MissingPermissions,
                  RESTJSONErrorCodes.MaximumNumberOfGuildRolesReached,
                ],
                async (e) => {
                  switch (e.code) {
                    case RESTJSONErrorCodes.MissingPermissions:
                      await errorFollowUp(itx, "Missing permissions");
                      return null;
                    case RESTJSONErrorCodes.MaximumNumberOfGuildRolesReached:
                      await errorFollowUp(itx, "Maximum number of roles reached (250)");
                      return null;
                    default:
                      await errorFollowUp(itx, "Failed to create role");
                      return null;
                  }
                },
              );
              if (!role) return;

              await ensureUserExists(prisma, owner.id);
              await prisma.colorRole.create({
                data: {
                  name,
                  ownerId: owner.id,
                  guildId: itx.guildId,
                  expiration,
                  roleId: role.id,
                  slots,
                  gradient,
                },
              });

              const member = await itx.guild.members.fetch(owner.id);
              await member.roles.add(role.id, "Utworzenie koloru");

              const expirationText = expiration
                ? time(expiration)
                : inlineCode("nigdy");

              await itx.editReply({
                content: `Dodano kolor ${name} dla ${owner.tag}, który wygaśnie: ${expirationText}`,
              });
            },
          ),
      )
      .addCommand("przypisz", (command) =>
        command
          .setDescription("[MODERACYJNE] Dodaj do bazy istniejący kolor")
          .addRole("rola", (role) =>
            role.setDescription("Rola do dodania").setRequired(true),
          )
          .addUser("właściciel", (owner) => owner.setDescription("Właściciel koloru"))
          .addInteger("sloty", (slots) =>
            slots.setDescription("Ilość slotów na użytkowników"),
          )

          .addBoolean("gradient", (gradient) =>
            gradient
              .setDescription("Czy kolor roli może używać gradientów")
              .setRequired(false),
          )
          .handle(
            async (
              { prisma },
              { rola: role, właściciel: owner, sloty: slots, gradient },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              if (!itx.memberPermissions.has(PermissionFlagsBits.ManageRoles)) return;
              await itx.deferReply();

              const colorRole = await prisma.colorRole.findFirst({
                where: {
                  guildId: itx.guildId,
                  roleId: role.id,
                },
              });

              if (colorRole) {
                const confirmation = new ConfirmationDialog(
                  "Rola jest już przypisana, czy chcesz ją nadpisać?",
                  "Nadpisz",
                  "Anuluj",
                  async () => {
                    await prisma.colorRole.update({
                      where: { id: colorRole.id },
                      data: {
                        ownerId: owner.id,
                        slots,
                        ...(gradient !== null ? { gradient } : {}),
                      },
                    });

                    await itx.followUp(`Nadpisano kolor ${role.name} dla ${owner.tag}`);
                  },
                  async () => {},
                  (buttonItx) => buttonItx.user.id === itx.user.id,
                );

                await confirmation.render({ send: itx.editReply.bind(itx) });

                return;
              }

              await ensureUserExists(prisma, owner.id);
              await prisma.colorRole.create({
                data: {
                  name: role.name,
                  ownerId: owner.id,
                  guildId: itx.guildId,
                  roleId: role.id,
                  slots,
                },
              });

              await itx.guild.members.addRole({ user: owner.id, role: role.id });
              await itx.editReply({
                content: `Dodano kolor ${role.name} dla ${owner.tag}`,
              });
            },
          ),
      )
      .addCommand("hex", (command) =>
        command
          .setDescription("Ustaw kolor roli na podstawie hexa")
          .addRole("rola", (role) =>
            role.setDescription("Rola której kolor zmienić").setRequired(true),
          )
          .addString("kolor", (primaryColor) =>
            primaryColor.setDescription("Hex jaki ustawić").setRequired(true),
          )
          .addString("kolor2", (secondaryColor) =>
            secondaryColor
              .setDescription("Drugi kolor do gradientu (jeśli rola może ich używać)")
              .setRequired(false),
          )
          .handle(
            async (
              { prisma },
              { rola: role, kolor: rawPrimaryColor, kolor2: rawSecondaryColor },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;

              await itx.deferReply();

              const primaryColor = getColor(rawPrimaryColor);
              if (!primaryColor)
                return await errorFollowUp(
                  itx,
                  `Niepoprawny kolor: ${rawPrimaryColor}`,
                );

              const colorRole = await prisma.colorRole.findFirst({
                where: {
                  ownerId: itx.user.id,
                  guildId: itx.guildId,
                  roleId: role.id,
                },
              });

              if (!colorRole) {
                return await errorFollowUp(itx, "Nie jesteś właścicielem tej roli");
              }

              const newColors: RoleColorsResolvable = { primaryColor };

              if (rawSecondaryColor) {
                if (!colorRole.gradient) {
                  return await errorFollowUp(itx, "Ta rola nie może używać gradientów");
                }

                const secondaryColor = getColor(rawSecondaryColor);
                if (!secondaryColor) {
                  return await errorFollowUp(
                    itx,
                    `Niepoprawny kolor: ${rawSecondaryColor}`,
                  );
                }

                newColors.secondaryColor = secondaryColor;
              }

              const result = await discordTry(
                () => role.setColors(newColors),
                [RESTJSONErrorCodes.MissingPermissions],
                () => errorFollowUp(itx, "Missing permissions"),
              );

              if (result) {
                const colorStrings = [`#${primaryColor.toString(16)}`];
                if (newColors.secondaryColor) {
                  colorStrings.push(`#${newColors.secondaryColor.toString(16)}`);
                }
                await itx.editReply({
                  content: `Zmieniono kolor roli ${role.name} na ${colorStrings.join(" -> ")}}`,
                });
              }
            },
          ),
      ),
  );
