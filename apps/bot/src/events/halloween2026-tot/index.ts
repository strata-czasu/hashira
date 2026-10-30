import {
  type Guild,
  RESTJSONErrorCodes,
  TimestampStyles,
  time,
  type User,
  userMention,
} from "discord.js";

import { type ExtractContext, Hashira } from "@hashira/core";
import type { Halloween2026TotItem } from "@hashira/db";
import { render } from "@hashira/jsx";

import { base } from "../../base";
import { formatBalance } from "../../economy/util";
import { universalAddMute } from "../../moderation/mutes";
import { discordTry } from "../../util/discordTry";
import { ensureUsersExist } from "../../util/ensureUsersExist";
import { errorFollowUp } from "../../util/errorFollowUp";
import {
  formatTotItem,
  TOT_CANDIES_PER_KAPSEL,
  TOT_ITEM_KEYS,
  TOT_ITEMS,
  TOT_MUTE_REASON,
} from "./constants";
import {
  answerTotKnock,
  type AnswerTotKnockResult,
  attachTotKnockMessages,
  cancelUndeliveredTotKnock,
  type CreateTotKnockResult,
  createTotKnock,
} from "./knockService";
import { finishTotKnockMessages } from "./messages";
import {
  buyTotItem,
  exchangeTotCandies,
  getTotPlayerSnapshot,
  setTotDoors,
  type TotUsableItem,
  useTotItem,
} from "./playerService";
import type { TotAnswerChoice, TotMuteResolution } from "./resolution";
import {
  buildTotBagView,
  buildTotDoorView,
  buildTotPorchView,
  buildTotShopView,
  describeTotAnswer,
  formatCandies,
  TOT_ANSWER_CUSTOM_ID,
  TOT_COMMAND,
} from "./views";

type BaseContext = ExtractContext<typeof base>;

const knockErrorMessage = (result: Exclude<CreateTotKnockResult, { ok: true }>, host: User) => {
  const who = userMention(host.id);
  switch (result.reason) {
    case "event_closed":
      return "Cukierek albo psikus trwa od 31 października do 2 listopada.";
    case "self_knock":
      return "Do własnych drzwi się nie puka.";
    case "knocker_doors_closed":
      return `Masz zamknięte drzwi, więc nie możesz chodzić po cukierki. Otworzysz je przez ${TOT_COMMAND} drzwi.`;
    case "host_doors_closed":
      return `${who} ma zamknięte drzwi.`;
    case "host_busy":
      return `Pod drzwiami ${who} ktoś już stoi. Spróbuj za kilka minut.`;
    case "knocker_cooldown":
      return `Odpocznij chwilę. Znowu zapukasz ${time(result.until, TimestampStyles.RelativeTime)}.`;
    case "host_cooldown":
      return `Do ${who} ktoś niedawno pukał. Spróbuj ${time(result.until, TimestampStyles.RelativeTime)}.`;
    case "pair_cooldown":
      return `Do ${who} znowu zapukasz ${time(result.until, TimestampStyles.RelativeTime)}.`;
  }
};

const answerErrorMessages = {
  knock_not_found: "Pod drzwiami nikogo już nie ma.",
  not_host: "To nie Twoje drzwi.",
  already_answered: "Te drzwi są już otwarte.",
  expired: "Za późno, gość już poszedł.",
  no_dice: "Nie masz już kostki losu.",
} satisfies Record<Exclude<AnswerTotKnockResult, { ok: true }>["reason"], string>;

const ANSWER_CHOICES = ["treat", "trick", "dice"] as const satisfies TotAnswerChoice[];
const isAnswerChoice = (value: string | undefined): value is TotAnswerChoice =>
  ANSWER_CHOICES.some((choice) => choice === value);

const USABLE_ITEMS = ["lollipop", "mask", "broom"] as const satisfies TotUsableItem[];
const isUsableItem = (value: string): value is TotUsableItem =>
  USABLE_ITEMS.some((item) => item === value);
const isItem = (value: string): value is Halloween2026TotItem =>
  TOT_ITEM_KEYS.some((item) => item === value);

const collectMutes = (mutes: TotMuteResolution[]): { userId: string; minutes: number }[] =>
  mutes.flatMap((mute) => {
    if (mute.kind === "muted") return [{ userId: mute.userId, minutes: mute.minutes }];
    if (mute.kind === "reflected") return collectMutes([mute.result]);
    return [];
  });

/**
 * Wyciszenia idą przez zwykły system wyciszeń, więc zostają w historii użytkownika
 * z powodem TOT_MUTE_REASON. Zwraca osoby, którym wyciszenie faktycznie nałożono.
 */
const applyTotMutes = async (
  ctx: Pick<BaseContext, "prisma" | "messageQueue" | "moderationLog">,
  guild: Guild,
  moderator: User,
  mutes: TotMuteResolution[],
) => {
  const applied = new Set<string>();
  for (const { userId, minutes } of collectMutes(mutes)) {
    try {
      const mute = await universalAddMute({
        prisma: ctx.prisma,
        messageQueue: ctx.messageQueue,
        log: ctx.moderationLog,
        userId,
        guild,
        moderator,
        duration: `${minutes}m`,
        reason: TOT_MUTE_REASON,
        reply: async () => {},
        replyToModerator: async () => {},
      });
      if (mute) applied.add(userId);
    } catch (error) {
      console.warn(`Failed to apply Halloween 2026 mute for ${userId}`, error);
    }
  }
  return applied;
};

const usableItemChoices = USABLE_ITEMS.map((item) => ({ name: formatTotItem(item), value: item }));
const itemChoices = TOT_ITEM_KEYS.map((item) => ({
  name: `${formatTotItem(item)} (${formatCandies(TOT_ITEMS[item].price)})`,
  value: item,
}));

export const halloween2026Tot = new Hashira({ name: "halloween2026-tot" })
  .use(base)
  .group("cukierek-albo-psikus", (group) =>
    group
      .setDescription("Halloweenowe pukanie do drzwi")
      .setDMPermission(false)
      .addCommand("zapukaj", (command) =>
        command
          .setDescription("Zapukaj do kogoś po cukierka")
          .addUser("osoba", (option) => option.setDescription("Do kogo pukasz"))
          .handle(async ({ prisma, messageQueue }, { osoba: host }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });

            if (host.bot) {
              await errorFollowUp(itx, "Boty nie otwierają drzwi.");
              return;
            }
            const member = await discordTry(
              () => itx.guild.members.fetch(host.id),
              [RESTJSONErrorCodes.UnknownMember],
              () => null,
            );
            if (!member) {
              await errorFollowUp(itx, "Tej osoby nie ma na serwerze.");
              return;
            }

            await ensureUsersExist(prisma, [itx.user, host]);
            const result = await createTotKnock(prisma, {
              guildId: itx.guildId,
              knockerId: itx.user.id,
              hostId: host.id,
              channelId: itx.channelId,
              now: itx.createdAt,
              scheduleExpiry: (tx, knock) =>
                messageQueue.push(
                  "halloween2026TotKnockExpire",
                  { knockId: knock.id },
                  knock.expiresAt,
                  knock.id.toString(),
                  tx,
                ),
            });
            if (!result.ok) {
              await errorFollowUp(itx, knockErrorMessage(result, host));
              return;
            }

            const { knock } = result;
            const dm = await discordTry(
              () =>
                host.send(
                  render(
                    buildTotDoorView({
                      knock,
                      guildName: itx.guild.name,
                      state: { type: "pending", hostHasDice: result.hostHasDice },
                    }),
                  ),
                ),
              [RESTJSONErrorCodes.CannotSendMessagesToThisUser],
              () => null,
            );
            if (!dm) {
              await cancelUndeliveredTotKnock(prisma, knock, result.previousLastKnockAt);
              await messageQueue.cancel("halloween2026TotKnockExpire", knock.id.toString());
              await errorFollowUp(
                itx,
                `${userMention(host.id)} ma zablokowane wiadomości prywatne, więc nie usłyszy pukania. Cooldown nie przepadł.`,
              );
              return;
            }

            const porch = itx.channel?.isSendable()
              ? await discordTry(
                  () =>
                    itx.channel!.send({
                      ...render(buildTotPorchView({ knock, state: { type: "pending" } })),
                      allowedMentions: { parse: [] },
                    }),
                  [RESTJSONErrorCodes.MissingAccess, RESTJSONErrorCodes.MissingPermissions],
                  () => null,
                )
              : null;
            await attachTotKnockMessages(prisma, knock.id, {
              dmChannelId: dm.channelId,
              dmMessageId: dm.id,
              ...(porch ? { messageId: porch.id } : {}),
            });

            await itx.editReply(
              knock.anonymous
                ? `Pukasz do ${userMention(host.id)} w masce. Nikt nie wie, że to Ty.`
                : `Pukasz do ${userMention(host.id)}. Jak tylko otworzy, wynik pojawi się na kanale.`,
            );
          }),
      )
      .addCommand("worek", (command) =>
        command
          .setDescription("Zobacz swoje cukierki i przedmioty")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });
            const snapshot = await getTotPlayerSnapshot(
              prisma,
              itx.guildId,
              itx.user.id,
              itx.createdAt,
            );
            await itx.editReply(render(buildTotBagView(snapshot)));
          }),
      )
      .addCommand("sklep", (command) =>
        command.setDescription("Zobacz, co można kupić za cukierki").handle(async (_, __, itx) => {
          await itx.reply({
            ...render(buildTotShopView()),
            flags: ["Ephemeral", "IsComponentsV2"],
          });
        }),
      )
      .addCommand("kup", (command) =>
        command
          .setDescription("Kup przedmiot za cukierki")
          .addString("przedmiot", (option) =>
            option.setDescription("Co kupujesz").addChoices(...itemChoices),
          )
          .handle(async ({ prisma }, { przedmiot }, itx) => {
            if (!itx.inCachedGuild()) return;
            if (!isItem(przedmiot)) return;
            await itx.deferReply({ flags: "Ephemeral" });
            await ensureUsersExist(prisma, [itx.user]);

            const item = TOT_ITEMS[przedmiot];
            const result = await buyTotItem(prisma, {
              guildId: itx.guildId,
              userId: itx.user.id,
              item: przedmiot,
            });
            if (!result.ok) {
              await errorFollowUp(
                itx,
                result.reason === "item_limit"
                  ? `Masz już ${result.limit}× ${formatTotItem(przedmiot)}, więcej się nie zmieści.`
                  : `${formatTotItem(przedmiot)} kosztuje ${formatCandies(item.price)}, a masz ${formatCandies(result.candies)}.`,
              );
              return;
            }
            await itx.editReply(
              `Kupujesz: ${formatTotItem(przedmiot)}. W worku zostaje ${formatCandies(result.candies)}.`,
            );
          }),
      )
      .addCommand("uzyj", (command) =>
        command
          .setDescription("Użyj przedmiotu z worka")
          .addString("przedmiot", (option) =>
            option.setDescription("Którego przedmiotu używasz").addChoices(...usableItemChoices),
          )
          .handle(async ({ prisma }, { przedmiot }, itx) => {
            if (!itx.inCachedGuild()) return;
            if (!isUsableItem(przedmiot)) return;
            await itx.deferReply({ flags: "Ephemeral" });
            await ensureUsersExist(prisma, [itx.user]);

            const result = await useTotItem(prisma, {
              guildId: itx.guildId,
              userId: itx.user.id,
              item: przedmiot,
              now: itx.createdAt,
            });
            if (!result.ok) {
              const messages = {
                no_item: `Nie masz w worku: ${formatTotItem(przedmiot)}.`,
                already_armed:
                  przedmiot === "lollipop"
                    ? "Jeden lizak już czeka w misce."
                    : "Maskę masz już na sobie.",
                no_cooldown: "Możesz już pukać, miotła się nie przyda.",
              };
              await errorFollowUp(itx, messages[result.reason]);
              return;
            }
            const replies = {
              lollipop:
                "Lizak leży w misce. Następna osoba, której dasz cukierka, dostanie go zamiast słodyczy.",
              mask: "Maska założona. Przy następnym pukaniu nikt Cię nie rozpozna.",
              broom: "Miotła gotowa, możesz pukać od razu.",
            } satisfies Record<TotUsableItem, string>;
            await itx.editReply(replies[przedmiot]);
          }),
      )
      .addCommand("wymien", (command) =>
        command
          .setDescription(`Wymień cukierki na kapsle (${TOT_CANDIES_PER_KAPSEL} za 1 kapsel)`)
          .addInteger("kapsle", (option) =>
            option.setDescription("Ile kapsli chcesz dostać").setMinValue(1),
          )
          .handle(async ({ prisma }, { kapsle }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply({ flags: "Ephemeral" });
            await ensureUsersExist(prisma, [itx.user]);

            const result = await exchangeTotCandies(prisma, {
              guildId: itx.guildId,
              userId: itx.user.id,
              kapsle,
              now: itx.createdAt,
            });
            if (!result.ok) {
              const message =
                result.reason === "exchange_closed"
                  ? `Wymiana cukierków na kapsle ruszy ${time(result.opensAt, TimestampStyles.RelativeTime)}.`
                  : result.reason === "invalid_amount"
                    ? "Podaj poprawną liczbę kapsli."
                    : `Na tyle kapsli potrzebujesz ${formatCandies(result.cost)}, a masz ${formatCandies(result.candies)}.`;
              await errorFollowUp(itx, message);
              return;
            }
            await itx.editReply(
              `Wymieniasz ${formatCandies(result.cost)} na ${formatBalance(kapsle, result.currencySymbol)}.`,
            );
          }),
      )
      .addCommand("drzwi", (command) =>
        command
          .setDescription("Otwórz albo zamknij swoje drzwi")
          .addBoolean("zamknij", (option) =>
            option.setDescription("Zamknięte drzwi: nikt do Ciebie nie puka, Ty też nie"),
          )
          .handle(async ({ prisma }, { zamknij }, itx) => {
            if (!itx.inCachedGuild()) return;
            await ensureUsersExist(prisma, [itx.user]);
            await setTotDoors(prisma, {
              guildId: itx.guildId,
              userId: itx.user.id,
              closed: zamknij,
            });
            await itx.reply({
              content: zamknij
                ? "Drzwi zamknięte. Nikt nie będzie do Ciebie pukać, ale Ty też nie możesz chodzić po cukierki."
                : "Drzwi otwarte. Można pukać.",
              flags: "Ephemeral",
            });
          }),
      ),
  )
  .handle("buttonInteractionCreate", async (ctx, itx) => {
    if (!itx.customId.startsWith(`${TOT_ANSWER_CUSTOM_ID}:`)) return;
    const [, rawKnockId, choice] = itx.customId.split(":");
    const knockId = Number(rawKnockId);
    if (!Number.isSafeInteger(knockId) || knockId <= 0 || !isAnswerChoice(choice)) return;

    await itx.deferUpdate();
    const result = await answerTotKnock(ctx.prisma, {
      knockId,
      userId: itx.user.id,
      choice,
      now: itx.createdAt,
      random: Math.random,
    });
    if (!result.ok) {
      await itx.followUp({ content: answerErrorMessages[result.reason], flags: "Ephemeral" });
      return;
    }

    const { knock, resolution } = result;
    const guild = itx.client.guilds.cache.get(knock.guildId);
    const applied = guild
      ? await applyTotMutes(ctx, guild, itx.client.user, resolution.mutes)
      : new Set<string>();

    await finishTotKnockMessages(itx.client, knock, {
      type: "answered",
      lines: describeTotAnswer(knock, resolution, applied),
    });
  });
