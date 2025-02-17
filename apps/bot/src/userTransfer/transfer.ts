import type { User as DbUser, ExtendedPrismaClient } from "@hashira/db";
import {
  type User as DiscordUser,
  type Guild,
  RESTJSONErrorCodes,
  userMention,
} from "discord.js";
import { transferBalances } from "../economy/managers/transferManager";
import { getDefaultWallet } from "../economy/managers/walletManager";
import { formatBalance } from "../economy/util";
import { formatVerificationType } from "../moderation/verification";
import { STRATA_CZASU_CURRENCY } from "../specializedConstants";
import { discordTry } from "../util/discordTry";

type TransferOperationOptions = {
  prisma: ExtendedPrismaClient;
  oldUser: DiscordUser;
  newUser: DiscordUser;
  oldDbUser: DbUser;
  newDbUser: DbUser;
  guild: Guild;
  moderator: DiscordUser;
};
type TransferOperation = (options: TransferOperationOptions) => Promise<string | null>;

export const transferRoles: TransferOperation = async ({
  oldUser,
  newUser,
  guild,
  moderator,
}) => {
  const oldMember = await discordTry(
    async () => guild.members.fetch(oldUser.id),
    [RESTJSONErrorCodes.UnknownMember],
    () => null,
  );
  const newMember = await discordTry(
    async () => guild.members.fetch(newUser.id),
    [RESTJSONErrorCodes.UnknownMember],
    () => null,
  );

  if (!oldMember || !newMember) return null;

  const roles = oldMember.roles.cache
    .filter((r) => r !== oldMember.guild.roles.everyone)
    .map((r) => r);
  if (roles.length === 0) return null;
  await newMember.roles.add(
    roles,
    `Przeniesienie roli z użytkownika ${oldMember.user.tag} (${oldMember.id}), moderator: ${moderator.tag} (${moderator.id})`,
  );
  return `Skopiowano ${roles.length} ról.`;
};

const transferVerification: TransferOperation = async ({
  prisma,
  oldDbUser,
  newDbUser,
}) => {
  if (!oldDbUser.verificationLevel) return null;
  await prisma.user.update({
    where: { id: newDbUser.id },
    data: { verificationLevel: oldDbUser?.verificationLevel },
  });
  return `Skopiowano poziom weryfikacji (${formatVerificationType(oldDbUser.verificationLevel)})...`;
};

const transferTextActivity: TransferOperation = async ({
  prisma,
  oldUser,
  newUser,
  guild,
}) => {
  const { count } = await prisma.userTextActivity.updateMany({
    where: { userId: oldUser.id, guildId: guild.id },
    data: { userId: newUser.id },
  });
  if (!count) return null;
  return `Przeniesiono aktywność tekstową (${count})...`;
};

const transferInventory: TransferOperation = async ({ prisma, oldUser, newUser }) => {
  const { count } = await prisma.inventoryItem.updateMany({
    where: { userId: oldUser.id },
    data: { userId: newUser.id },
  });
  if (!count) return null;
  return `Przeniesiono ${count} przedmioty`;
};

const transferWallets: TransferOperation = async ({
  prisma,
  oldUser,
  newUser,
  guild,
}) => {
  const oldWallet = await getDefaultWallet({
    prisma,
    userId: oldUser.id,
    guildId: guild.id,
    currencySymbol: STRATA_CZASU_CURRENCY.symbol,
  });
  if (!oldWallet.balance) return null;
  await transferBalances({
    prisma,
    fromUserId: oldUser.id,
    toUserIds: [newUser.id],
    guildId: guild.id,
    currencySymbol: STRATA_CZASU_CURRENCY.symbol,
    amount: oldWallet.balance,
    reason: `Przeniesienie z konta ${oldUser.id} na ${newUser.id}`,
  });
  // TODO: Wallet transfer for custom currencies
  return `Przeniesiono ${formatBalance(oldWallet.balance, STRATA_CZASU_CURRENCY.symbol)}`;
};

const transferUltimatum: TransferOperation = async ({
  prisma,
  oldUser,
  newUser,
  guild,
}) => {
  const { count } = await prisma.ultimatum.updateMany({
    where: { userId: oldUser.id, guildId: guild.id },
    data: { userId: newUser.id },
  });
  if (!count) return null;
  return `Przeniesiono ${count} ultimatum`;
};

const transferMutes: TransferOperation = async ({
  prisma,
  oldUser,
  newUser,
  guild,
}) => {
  const { count } = await prisma.mute.updateMany({
    where: { userId: oldUser.id, guildId: guild.id },
    data: { userId: newUser.id },
  });
  if (!count) return null;
  return `Przeniesiono ${count} wyciszeń`;
};

const transferWarns: TransferOperation = async ({
  prisma,
  oldUser,
  newUser,
  guild,
}) => {
  const { count } = await prisma.warn.updateMany({
    where: { userId: oldUser.id, guildId: guild.id },
    data: { userId: newUser.id },
  });
  if (!count) return null;
  return `Przeniesiono ${count} ostrzeżeń`;
};

const transferDmPollParticipations: TransferOperation = async ({
  prisma,
  oldUser,
  newUser,
}) => {
  const { count } = await prisma.dmPollParticipant.updateMany({
    where: { userId: oldUser.id },
    data: { userId: newUser.id },
  });
  if (!count) return null;
  return `Przeniesiono uczestnictwo w ${count} ankietach`;
};

const transferDmPollVotes: TransferOperation = async ({ prisma, oldUser, newUser }) => {
  const { count } = await prisma.dmPollVote.updateMany({
    where: { userId: oldUser.id },
    data: { userId: newUser.id },
  });
  if (!count) return null;
  return `Przeniesiono głosy w ${count} ankietach`;
};

const transferDmPollExclusion: TransferOperation = async ({
  prisma,
  oldUser,
  newUser,
}) => {
  const { count } = await prisma.dmPollExclusion.updateMany({
    where: { userId: oldUser.id },
    data: { userId: newUser.id },
  });
  if (!count) return null;
  return "Przeniesiono wykluczenie z ankiet";
};

const transferMarriage: TransferOperation = async ({ prisma, oldDbUser }) => {
  if (!oldDbUser.marriedTo) return null;
  await prisma.user.updateMany({
    where: { id: { in: [oldDbUser.id, oldDbUser.marriedTo] } },
    data: { marriedTo: null, marriedAt: null },
  });
  return `Stary user ma aktywne małżeństwo. Rozwiedziono ${userMention(oldDbUser.id)} (${oldDbUser.id}) z ${userMention(oldDbUser.marriedTo)} (${oldDbUser.marriedTo})`;
};

// TODO: Voice activity
// TODO: Experience and level

export const TRANSFER_OPERATIONS: TransferOperation[] = [
  transferRoles,
  transferVerification,
  transferTextActivity,
  transferInventory,
  transferWallets,
  transferUltimatum,
  transferMutes,
  transferWarns,
  transferDmPollParticipations,
  transferDmPollVotes,
  transferDmPollExclusion,
  transferMarriage,
] as const;
