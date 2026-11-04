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
import { sendDirectMessage } from "../../util/sendDirectMessage";
import { findDueTotApples } from "./appleService";
import {
  formatTotItem,
  TOT_APPLE_MUTE_REASON,
  TOT_APPLE_SWEEP_SECONDS,
  TOT_CANDIES_PER_KAPSEL,
  TOT_ITEM_KEYS,
  TOT_ITEMS,
  TOT_MUTE_REASON,
} from "./constants";
import {
  answerTotKnock,
  type AnswerTotKnockResult,
  attachTotKnockMessages,
  biteTotApple,
  cancelUndeliveredTotKnock,
  type CreateTotKnockResult,
  createTotKnock,
} from "./knockService";
import { finishTotKnockMessages } from "./messages";
import {
  buyTotItem,
  exchangeTotCandies,
  getTotPlayerSnapshot,
  type TotUsableItem,
  useTotItem,
} from "./playerService";
import type { TotAnswerChoice, TotMuteResolution } from "./resolution";
import {
  buildTotBagView,
  buildTotPorchView,
  buildTotShopView,
  describeTotAnswer,
  describeTotAppleBite,
  describeTotApplePassed,
  describeTotAppleReceived,
  describeTotAppleSeeded,
  formatCandies,
  TOT_ANSWER_CUSTOM_ID,
} from "./views";

type BaseContext = ExtractContext<typeof base>;

const knockErrorMessage = (result: Exclude<CreateTotKnockResult, { ok: true }>, host: User) => {
  const who = userMention(host.id);
  switch (result.reason) {
    case "event_closed":
      return "Cukierek albo psikus trwa od 31 października do 2 listopada.";
    case "self_knock":
      return "Do własnych drzwi się nie puka.";
    case "host_busy":
      return `Pod drzwiami ${who} ktoś już stoi. Spróbuj za kilka minut.`;
    case "apple_return":
      return `Zatrute jabłko nie wróci do ${who}, bo to od tej osoby je masz. Zapukaj do kogoś innego.`;
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

const applyTotMutes = async (
  ctx: Pick<BaseContext, "prisma" | "messageQueue" | "moderationLog">,
  guild: Guild,
  moderator: User,
  mutes: TotMuteResolution[],
  reason = TOT_MUTE_REASON,
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
        reason,
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
  .command("zapukaj", (command) =>
    command
      .setDescription("Zapukaj do kogoś po cukierka")
      .setDMPermission(false)
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
        const porch = itx.channel?.isSendable()
          ? await discordTry(
              () =>
                itx.channel!.send({
                  ...render(
                    buildTotPorchView({
                      knock,
                      state: { type: "pending", hostHasDice: result.hostHasDice },
                    }),
                  ),
                  allowedMentions: { users: [host.id] },
                }),
              [RESTJSONErrorCodes.MissingAccess, RESTJSONErrorCodes.MissingPermissions],
              () => null,
            )
          : null;
        if (!porch) {
          await cancelUndeliveredTotKnock(
            prisma,
            knock,
            result.previousLastKnockAt,
            result.seededApple?.id ?? null,
          );
          await messageQueue.cancel("halloween2026TotKnockExpire", knock.id.toString());
          await errorFollowUp(
            itx,
            "Nie mogę pisać na tym kanale, więc nikt nie usłyszy pukania. Cooldown nie przepadł.",
          );
          return;
        }
        await attachTotKnockMessages(prisma, knock.id, { messageId: porch.id });

        await itx.editReply(
          [
            knock.anonymous
              ? `Pukasz do ${userMention(host.id)} w masce. Nikt nie wie, że to Ty.`
              : `Pukasz do ${userMention(host.id)}. Jak tylko otworzy, wynik pojawi się na kanale.`,
            ...(result.carriesApple
              ? ["Niesiesz zatrute jabłko. Jeśli drzwi się otworzą, zostanie u gospodarza."]
              : []),
            ...(result.seededApple ? [describeTotAppleSeeded(result.seededApple.fuseEndsAt)] : []),
          ].join("\n"),
        );
      }),
  )
  .group("cukierek-albo-psikus", (group) =>
    group
      .setDescription("Halloweenowe pukanie do drzwi")
      .setDMPermission(false)
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

    const { knock, resolution, applePass } = result;
    const guild = itx.client.guilds.cache.get(knock.guildId);
    const applied = guild
      ? await applyTotMutes(ctx, guild, itx.client.user, resolution.mutes)
      : new Set<string>();

    await finishTotKnockMessages(itx.client, knock, {
      type: "answered",
      lines: describeTotAnswer(knock, resolution, applied),
    });

    if (applePass) {
      const knocker = await itx.client.users.fetch(knock.knockerId).catch(() => null);
      await Promise.all([
        sendDirectMessage(
          itx.user,
          describeTotAppleReceived(guild?.name ?? "serwer", applePass.apple.fuseEndsAt),
        ),
        knocker ? sendDirectMessage(knocker, describeTotApplePassed(applePass.reward)) : null,
      ]);
    }
  })
  .handle("clientReady", async (ctx, client) => {
    const sweep = async () => {
      try {
        for (const { id } of await findDueTotApples(ctx.prisma, new Date())) {
          const result = await biteTotApple(ctx.prisma, id, new Date());
          if (!result?.bite) continue;

          const { apple, bite } = result;
          const guild = client.guilds.cache.get(apple.guildId);
          if (!guild) continue;
          const applied = await applyTotMutes(
            ctx,
            guild,
            client.user,
            [bite.mute],
            TOT_APPLE_MUTE_REASON,
          );

          const channel = await client.channels.fetch(apple.channelId).catch(() => null);
          if (!channel?.isSendable()) continue;
          await discordTry(
            () =>
              channel.send({
                content: describeTotAppleBite(apple, bite, applied).join("\n"),
                allowedMentions: { users: [apple.holderId] },
              }),
            [RESTJSONErrorCodes.MissingAccess, RESTJSONErrorCodes.MissingPermissions],
            () => null,
          );
        }
      } catch (error) {
        console.error("Error biting Halloween 2026 apples:", error);
      }
    };

    setInterval(sweep, TOT_APPLE_SWEEP_SECONDS * 1000);
    await sweep();
  });
