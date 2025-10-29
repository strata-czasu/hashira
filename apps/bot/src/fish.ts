import { Hashira } from "@hashira/core";
import type { ExtendedPrismaClient } from "@hashira/db";
import { sleep } from "bun";
import { addMinutes, isAfter, secondsToMilliseconds } from "date-fns";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  channelLink,
  PermissionFlagsBits,
  TimestampStyles,
  time,
} from "discord.js";
import { randomInt } from "es-toolkit";
import { base } from "./base";
import { addBalance } from "./economy/managers/transferManager";
import { formatBalance } from "./economy/util";
import { STRATA_CZASU_CURRENCY } from "./specializedConstants";
import { ensureUserExists } from "./util/ensureUsersExist";
import { errorFollowUp } from "./util/errorFollowUp";
import { waitForButtonClick } from "./util/singleUseButton";
import { weightedRandom } from "./util/weightedRandom";

const checkIfCanFish = async (
  prisma: ExtendedPrismaClient,
  userId: string,
  guildId: string,
): Promise<[boolean, Date]> => {
  const fishing = await prisma.lastFishing.findFirst({
    where: { userId, guildId },
    orderBy: { timestamp: "desc" },
  });

  const lastFishing = fishing?.timestamp ?? new Date(0);
  const nextFishing = addMinutes(lastFishing, 60);
  const canFish = isAfter(new Date(), nextFishing);

  return [canFish, nextFishing];
};

type FishRoll = { id: number; name: string; amount: number };

const lizardFish =
  "<:ryboszczurka1:1393271454547710223><:ryboszczurka2:1393271478111309834>";
const catFish = "<:kotoryba1:1370101554425630821><:kotoryba2:1370109036279894108>";
const halloweenCarp = "<:jpipbpipny:1431461464635342979><:karas:1431461466132840518>";

// Sorted by the average value
const FISH_TABLE = [
  { id: 10, name: "wonsza żecznego", minAmount: -130, maxAmount: -70, weight: 1 },
  { id: 12, name: lizardFish, minAmount: -30, maxAmount: -10, weight: 1 },
  { id: 1, name: "buta", minAmount: 1, maxAmount: 1, weight: 1 },
  { id: 2, name: "karasia", minAmount: 30, maxAmount: 60, weight: 7 },
  { id: 14, name: halloweenCarp, minAmount: 10, maxAmount: 90, weight: 21 },
  { id: 3, name: "śledzia", minAmount: 50, maxAmount: 80, weight: 19 },
  { id: 4, name: "dorsza", minAmount: 60, maxAmount: 90, weight: 15 },
  { id: 5, name: "pstrąga", minAmount: 80, maxAmount: 110, weight: 10 },
  { id: 6, name: "szczupaka :crown:", minAmount: 90, maxAmount: 110, weight: 10 },
  { id: 7, name: "suma", minAmount: 110, maxAmount: 130, weight: 10 },
  { id: 8, name: "rekina", minAmount: 150, maxAmount: 180, weight: 2 },
  { id: 11, name: catFish, minAmount: 200, maxAmount: 254, weight: 1 },
  { id: 13, name: "halibuta", minAmount: 270, maxAmount: 330, weight: 1 },
  { id: 9, name: "bombardiro crocodilo", minAmount: 900, maxAmount: 1100, weight: 1 },
] as const;

const getFishById = (id: number): FishRoll | null => {
  const fish = FISH_TABLE.find((f) => f.id === id);
  if (!fish) return null;

  return {
    id: fish.id,
    name: fish.name,
    amount: randomInt(fish.minAmount, fish.maxAmount + 1),
  };
};

type Fish = (typeof FISH_TABLE)[number];
const getRandomFish = () => weightedRandom<Fish>(FISH_TABLE, (fish) => fish.weight);

export const fish = new Hashira({ name: "fish" })
  .use(base)
  .command("wedka", (command) =>
    command
      .setDMPermission(false)
      .setDescription("Nielegalny połów ryb")
      .handle(async ({ prisma, messageQueue }, _, itx) => {
        if (!itx.inCachedGuild()) return;
        await ensureUserExists(prisma, itx.user);

        const [canFish, nextFishing] = await checkIfCanFish(
          prisma,
          itx.user.id,
          itx.guildId,
        );

        if (!canFish) {
          await itx.reply({
            content: `Dalej masz PZW na karku. Następną rybę możesz wyłowić ${time(nextFishing, TimestampStyles.RelativeTime)}`,
            flags: "Ephemeral",
          });
          return;
        }

        await itx.deferReply();

        const { id } = getRandomFish();
        // biome-ignore lint/style/noNonNullAssertion: This is guaranteed to find a fish
        const { name, amount } = getFishById(id)!;

        await addBalance({
          prisma,
          currencySymbol: STRATA_CZASU_CURRENCY.symbol,
          reason: `Łowienie ${id}`,
          guildId: itx.guildId,
          toUserId: itx.user.id,
          amount,
        });

        await prisma.lastFishing.create({
          data: { userId: itx.user.id, guildId: itx.guildId },
        });

        const balance = formatBalance(amount, STRATA_CZASU_CURRENCY.symbol);

        const reminderButton = new ButtonBuilder()
          .setCustomId("fish_reminder")
          .setLabel("Przypomnij mi za godzinę")
          .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(reminderButton);

        const response = await itx.editReply({
          content: `Wyławiasz ${name} wartego ${balance}`,
          components: [row],
        });

        const clickInfo = await waitForButtonClick(
          response,
          "fish_reminder",
          { minutes: 1 },
          (interaction) => interaction.user.id === itx.user.id,
        );

        if (!clickInfo.interaction) {
          return await clickInfo.removeButton();
        }

        await Promise.all([
          clickInfo.interaction.reply({
            content: "Przypomnę Ci o łowieniu za godzinę!",
            flags: "Ephemeral",
          }),
          clickInfo.editButton((builder) =>
            builder
              .setDisabled(true)
              .setLabel("Widzimy się za godzinę")
              .setStyle(ButtonStyle.Success),
          ),
          messageQueue.push(
            "reminder",
            {
              userId: itx.user.id,
              guildId: itx.guildId,
              text: `Możesz znowu łowić ryby! Udaj się nad wodę i spróbuj szczęścia! (${channelLink(itx.channelId, itx.guildId)})`,
            },
            addMinutes(itx.createdAt, 60),
          ),
        ]);

        await sleep(secondsToMilliseconds(15));

        await clickInfo.removeButton();
      }),
  )
  .group("wedka-admin", (group) =>
    group
      .setDescription("Administracja łowienia ryb")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addCommand("force-fish", (command) =>
        command
          .setDescription("Zmusza użytkownika do złowienia ryby o konkretnym ID")
          .addUser("user", (option) =>
            option.setDescription("Użytkownik który ma złowić rybę").setRequired(true),
          )
          .addInteger("fish-id", (option) =>
            option
              .setDescription("ID ryby do złowienia")
              .setRequired(true)
              .addChoices(
                ...FISH_TABLE.map((fish) => ({
                  name: `${fish.id}: ${fish.name}`,
                  value: fish.id,
                })),
              ),
          )
          .handle(async ({ prisma }, { user, "fish-id": fishId }, itx) => {
            if (!itx.inCachedGuild()) return;

            await ensureUserExists(prisma, user);

            const fish = getFishById(fishId);

            if (!fish) {
              return errorFollowUp(itx, "Błąd: Nie znaleziono ryby o tym ID");
            }

            await addBalance({
              prisma,
              currencySymbol: STRATA_CZASU_CURRENCY.symbol,
              reason: `Admin force fish ${fish.id}`,
              guildId: itx.guildId,
              toUserId: user.id,
              amount: fish.amount,
            });

            const balance = formatBalance(fish.amount, STRATA_CZASU_CURRENCY.symbol);

            await itx.reply({
              content: `${user} został zmuszony do złowienia ${fish.name} wartego ${balance}`,
              flags: "Ephemeral",
            });
          }),
      ),
  );
