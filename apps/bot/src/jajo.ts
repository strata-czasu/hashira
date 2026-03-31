import { Hashira } from "@hashira/core";
import { sleep } from "bun";
import { addMinutes, secondsToMilliseconds } from "date-fns";
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
import {
  checkIfCanFish,
  FISH_TABLE,
  getItemById,
  getRandomItem,
  type ItemTableEntry,
} from "./fish";
import { STRATA_CZASU_CURRENCY } from "./specializedConstants";
import { ensureUserExists } from "./util/ensureUsersExist";
import { errorFollowUp } from "./util/errorFollowUp";
import { waitForButtonClick } from "./util/singleUseButton";

const threeEggs = "<:jaja:1488655930068566186>";
const oneEgg = "<:jajo:1488655909390389389>";
const crackedEgg = "<:rozbitejajo:1488655886158401556>";
const hardBoiledEgg = "<:twardejaja:1488655844009578637>";
const eggCat = "<:jajkot:1488655794290299031>";
const eggFish = "<:jajoryba:1488655757280022629>";
const drapankaEgg = "<:drapanka:1488655716058136819>";

const EGG_MESSAGES: Record<number, string> = {
  2: "Niesamowite, w koszyczku znaleziono {{name}}. Dostajesz {{balance}}.",
  1001: "Och, wypadło ci jajko z koszyczka? {{name}}. Zajączek skasował cię na {{balance}}.",
  1005: "Tego jajkota {{name}} się tu nie spodziewałem! Dostajesz {{balance}}.",
  1006: "O, {{name}}! Karaś zmienił się w jajko! Dostajesz {{balance}}.",
  1007: "Zajączek wielkanocny upuścił {{name}} podczas ucieczki! Dostajesz {{balance}}.",
};

const formatEggMessage = (eggId: number, name: string, balance: string): string => {
  const template = EGG_MESSAGES[eggId];
  if (!template) return `Znajdujesz ${name}! Dostajesz ${balance}.`;

  return (
    template
      .replace("{{name}}", name)
      // Function is used to prevent issues with replace using dollar signs in replacer
      .replace("{{balance}}", () => balance)
  );
};

// Sorted by the average value
const EGG_TABLE = [
  { id: 1001, name: crackedEgg, minAmount: -250, maxAmount: -250, weight: 6 },
  { id: 1002, name: oneEgg, minAmount: 30, maxAmount: 60, weight: 70 },
  { id: 1003, name: hardBoiledEgg, minAmount: 50, maxAmount: 80, weight: 38 },
  { id: 1004, name: threeEggs, minAmount: 80, maxAmount: 110, weight: 20 },
  { id: 1005, name: eggFish, minAmount: 110, maxAmount: 150, weight: 20 },
  { id: 1006, name: eggCat, minAmount: 200, maxAmount: 254, weight: 6 },
  { id: 1007, name: drapankaEgg, minAmount: 400, maxAmount: 600, weight: 3 },
  { ...FISH_TABLE[3], weight: 1 },
] as const satisfies ItemTableEntry[];

const WEDKA_MOCK_MESSAGES = [
  "Zapomniałeś, że łowisko jest zamknięte na wielkanoc?",
  "Łowisko nieczynne — wielkanocna przerwa!",
  "Ryby mają wolne na święta!",
  "PZW ogłosiło wielkanocny zakaz połowu!",
  "Zamiast moczyć kij, poszukaj lepiej jajek!",
  "Ryby malują pisanki, nie mają czasu na branie.",
  "Królik wielkanocny zarekwirował wszystkie wędki!",
  "Zarzuciłeś spławik, ale wyłowiłeś tylko mokrą rzeżuchę.",
  "Państwowa Straż Rybacka sprawdza dzisiaj tylko koszyczki ze święconką.",
  "Szczupak poszedł święcić koszyczki, wraca po świętach.",
  "Wędka zaplątała się w koszyczek. Odpuść sobie i idź szukać pisanek!",
  "Brak brań! Podobno wszystkie ryby pomagają zajączkowi chować jajka.",
  "Woda w stawie zamieniła się w żurek. Tutaj nic nie złowisz.",
  "Karaś zjadł tyle sałatki jarzynowej, że nawet nie spojrzał na twoją przynętę.",
];

export const jajo = new Hashira({ name: "jajo" })
  .use(base)
  .command("jajo", (command) =>
    command
      .setDMPermission(false)
      .setDescription("Wielkanocne polowanie na jajka")
      .handle(async ({ prisma, messageQueue }, _, itx) => {
        if (!itx.inCachedGuild()) return;

        await itx.deferReply();
        await ensureUserExists(prisma, itx.user);

        const [canFish, nextFishing] = await checkIfCanFish(
          prisma,
          itx.user.id,
          itx.guildId,
        );

        if (!canFish) {
          await itx.editReply({
            content: `Już szukałeś jajek! Zając schowa nowe ${time(nextFishing, TimestampStyles.RelativeTime)}`,
          });
          await sleep(secondsToMilliseconds(5));
          await itx.deleteReply();
          return;
        }

        const { id } = getRandomItem(EGG_TABLE);
        // biome-ignore lint/style/noNonNullAssertion: This is guaranteed to find an egg
        const { name, amount } = getItemById(EGG_TABLE, id)!;

        await addBalance({
          prisma,
          currencySymbol: STRATA_CZASU_CURRENCY.symbol,
          reason: `Szukanie jajek ${id}`,
          guildId: itx.guildId,
          toUserId: itx.user.id,
          amount,
        });

        await prisma.lastFishing.create({
          data: { userId: itx.user.id, guildId: itx.guildId },
        });

        const balance = formatBalance(amount, STRATA_CZASU_CURRENCY.symbol);
        const content = formatEggMessage(id, name, balance);

        const reminderButton = new ButtonBuilder()
          .setCustomId("egg_reminder")
          .setLabel("Przypomnij mi za godzinę")
          .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(reminderButton);

        const response = await itx.editReply({
          content,
          components: [row],
        });

        const clickInfo = await waitForButtonClick(
          response,
          "egg_reminder",
          { minutes: 1 },
          (interaction) => interaction.user.id === itx.user.id,
        );

        if (!clickInfo.interaction) {
          return await clickInfo.removeButton();
        }

        await Promise.all([
          clickInfo.interaction.reply({
            content: "Przypomnę Ci o szukaniu jajek za godzinę!",
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
              text: `Zając gdzieś znowu schował jajka! Idź szukać pisanek! (${channelLink(itx.channelId, itx.guildId)})`,
            },
            addMinutes(itx.createdAt, 60),
          ),
        ]);

        await sleep(secondsToMilliseconds(15));

        await clickInfo.removeButton();
      }),
  )
  .command("wedka", (command) =>
    command
      .setDMPermission(false)
      .setDescription("Nielegalny połów ryb")
      .handle(async ({ prisma, messageQueue }, _, itx) => {
        if (!itx.inCachedGuild()) return;

        await itx.deferReply();
        await ensureUserExists(prisma, itx.user);

        const [canFish, nextFishing] = await checkIfCanFish(
          prisma,
          itx.user.id,
          itx.guildId,
        );

        if (!canFish) {
          await itx.editReply({
            content: `Już szukałeś jajek! Zając schowa nowe ${time(nextFishing, TimestampStyles.RelativeTime)}`,
          });
          await sleep(secondsToMilliseconds(5));
          await itx.deleteReply();
          return;
        }

        const { id } = getRandomItem(EGG_TABLE);
        // biome-ignore lint/style/noNonNullAssertion: This is guaranteed to find an egg
        const { name, amount } = getItemById(EGG_TABLE, id)!;

        await addBalance({
          prisma,
          currencySymbol: STRATA_CZASU_CURRENCY.symbol,
          reason: `Szukanie jajek ${id}`,
          guildId: itx.guildId,
          toUserId: itx.user.id,
          amount,
        });

        await prisma.lastFishing.create({
          data: { userId: itx.user.id, guildId: itx.guildId },
        });

        const balance = formatBalance(amount, STRATA_CZASU_CURRENCY.symbol);
        const mockMessage =
          // biome-ignore lint/style/noNonNullAssertion: this is guaranteed to find an egg
          WEDKA_MOCK_MESSAGES[randomInt(0, WEDKA_MOCK_MESSAGES.length)]!;
        const eggMessage = formatEggMessage(id, name, balance);

        const mockResponse = await itx.editReply({ content: mockMessage });

        const reminderButton = new ButtonBuilder()
          .setCustomId("egg_reminder")
          .setLabel("Przypomnij mi za godzinę")
          .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(reminderButton);

        const response = await itx.followUp({
          content: eggMessage,
          components: [row],
        });

        const clickInfo = await waitForButtonClick(
          response,
          "egg_reminder",
          { minutes: 1 },
          (interaction) => interaction.user.id === itx.user.id,
        );

        if (!clickInfo.interaction) {
          await mockResponse.delete();
          return await clickInfo.removeButton();
        }

        await Promise.all([
          clickInfo.interaction.reply({
            content: "Przypomnę Ci o szukaniu jajek za godzinę!",
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
              text: `Zając gdzieś znowu schował jajka! Idź szukać pisanek! (${channelLink(itx.channelId, itx.guildId)})`,
            },
            addMinutes(itx.createdAt, 60),
          ),
        ]);

        await sleep(secondsToMilliseconds(15));

        await mockResponse.delete();
        await clickInfo.removeButton();
      }),
  )
  .group("jajo-admin", (group) =>
    group
      .setDescription("Administracja polowania na jajka")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addCommand("force-egg", (command) =>
        command
          .setDescription("Zmusza użytkownika do znalezienia jajka o konkretnym ID")
          .addUser("user", (option) =>
            option
              .setDescription("Użytkownik który ma znaleźć jajko")
              .setRequired(true),
          )
          .addInteger("egg-id", (option) =>
            option
              .setDescription("ID jajka do znalezienia")
              .setRequired(true)
              .addChoices(
                ...EGG_TABLE.map((egg) => ({
                  name: `${egg.id}: ${egg.name}`,
                  value: egg.id,
                })),
              ),
          )
          .handle(async ({ prisma }, { user, "egg-id": eggId }, itx) => {
            if (!itx.inCachedGuild()) return;

            await ensureUserExists(prisma, user);

            const egg = getItemById(EGG_TABLE, eggId);

            if (!egg) {
              return errorFollowUp(itx, "Błąd: Nie znaleziono jajka o tym ID");
            }

            await addBalance({
              prisma,
              currencySymbol: STRATA_CZASU_CURRENCY.symbol,
              reason: `Admin force egg ${egg.id}`,
              guildId: itx.guildId,
              toUserId: user.id,
              amount: egg.amount,
            });

            const balance = formatBalance(egg.amount, STRATA_CZASU_CURRENCY.symbol);

            await itx.reply({
              content: `${user} znalazł ${egg.name} warte ${balance}`,
              flags: "Ephemeral",
            });
          }),
      )
      .addCommand("clear-cooldown", (command) =>
        command
          .setDescription("Czyści cooldown użytkownika")
          .addUser("user", (option) =>
            option.setDescription("Użytkownik którego cooldown ma być wyczyszczony"),
          )
          .handle(async ({ prisma }, { user }, itx) => {
            if (!itx.inCachedGuild()) return;

            await ensureUserExists(prisma, user);

            await prisma.lastFishing.deleteMany({
              where: { userId: user.id, guildId: itx.guildId },
            });

            await itx.reply({
              content: `${user} cooldown został wyczyszczony`,
              flags: "Ephemeral",
            });
          }),
      ),
  );
