import type { Duration } from "date-fns";

import type { ExtendedPrismaClient, GiveawayRewardType, Item } from "@hashira/db";

import { durationToSeconds, formatDuration, parseDuration } from "../util/duration";

export type RewardType = Exclude<GiveawayRewardType, null>;

export type AnalyzedReward = {
  reward: string;
  amount: number;
  type: RewardType | null;
  parsedValue: number | null;
  parsedDuration: Duration | null;
  matchedItem: Item | null;
};

const CURRENCY_RE =
  /^\s*([+-]?(?:\d+[.,]?\d*|[.,]\d+))\s*(?:pkt[.]?|punkt(?:y|ów|u)?|kapsle|k)\s*$/i;

const MUTE_RE = /(?:^|\s)(?:wycisze(?:nie|nia)|mute|muta)(?:\s|$)/i;

const DURATION_RE = /([+-]?\d+\s*[smhd])/gi;

const KAPSLE_UNIT = "kapsle";

export const analyzeCurrencyReward = (reward: string): number | null => {
  const match = reward.match(CURRENCY_RE);
  if (!match) return null;

  const number = match[1];
  if (!number) return null;

  const value = Number(number.replace(",", "."));
  if (Number.isNaN(value)) return null;

  return value;
};

const CURRENCY_UNIT_WORDS = ["pkt", "punkty", "punkt", "kapsel", "kapsli"];

const CURRENCY_FUZZY_THRESHOLD = 2;

const extractCurrencyNumberAndUnit = (reward: string): { value: number; unit: string } | null => {
  const match = reward.match(/^\s*([+-]?(?:\d+[.,]?\d*|[.,]\d+))\s+(\S+)\s*$/i);
  if (!match) return null;

  const value = Number(match[1]!.replace(",", "."));
  if (Number.isNaN(value)) return null;

  return { value, unit: match[2]!.toLowerCase() };
};

export const analyzeCurrencyRewardFuzzy = (reward: string): number | null => {
  const extracted = extractCurrencyNumberAndUnit(reward);
  if (!extracted) return null;

  const { value, unit } = extracted;

  let bestDistance = Infinity;
  for (const word of CURRENCY_UNIT_WORDS) {
    const distance = levenshtein(unit, word);
    if (distance < bestDistance) bestDistance = distance;
  }

  if (bestDistance <= CURRENCY_FUZZY_THRESHOLD) return value;

  return null;
};

export const isMuteReward = (reward: string): boolean => MUTE_RE.test(reward);

export const parseMuteDuration = (reward: string): Duration | null => {
  const match = reward.match(DURATION_RE);
  if (!match) return null;
  return parseDuration(match.join(" "));
};

const DIACRITIC_MAP: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
};

const normalizeText = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (char) => DIACRITIC_MAP[char] ?? char)
    .replace(/[^a-z0-9]/g, "");

export const levenshtein = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const curr: number[] = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const insert = (curr[j - 1] ?? 0) + 1;
      const remove = (prev[j] ?? 0) + 1;
      const replace = (prev[j - 1] ?? 0) + cost;
      curr[j] = Math.min(insert, remove, replace);
    }
    prev = curr;
  }

  return prev[n] ?? 0;
};

const MATCH_THRESHOLD = 2;

const findItemMatch = (items: Item[], reward: string): Item | null => {
  const normalizedReward = normalizeText(reward.trim());

  const exact = items.find((item) => normalizeText(item.name) === normalizedReward);
  if (exact) return exact;

  let best: Item | null = null;
  let bestDistance = Infinity;

  for (const item of items) {
    const distance = levenshtein(normalizedReward, normalizeText(item.name));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = item;
    }
  }

  if (best && bestDistance <= MATCH_THRESHOLD) return best;

  return null;
};

export const fetchGuildItems = (prisma: ExtendedPrismaClient, guildId: string): Promise<Item[]> =>
  prisma.item.findMany({
    where: { guildId, deletedAt: null },
  });

export const analyzeRewards = async (
  rewards: { reward: string; amount: number }[],
  prisma: ExtendedPrismaClient,
  guildId: string,
): Promise<AnalyzedReward[]> => {
  const analyzed = rewards.map<AnalyzedReward>(({ reward, amount }) => ({
    reward,
    amount,
    type: null,
    parsedValue: null,
    parsedDuration: null,
    matchedItem: null,
  }));

  for (const entry of analyzed) {
    let parsedValue = analyzeCurrencyReward(entry.reward);
    if (parsedValue === null) {
      parsedValue = analyzeCurrencyRewardFuzzy(entry.reward);
    }
    if (parsedValue !== null) {
      entry.type = "currency";
      entry.parsedValue = parsedValue;
    }
  }

  for (const entry of analyzed) {
    if (entry.type === null && isMuteReward(entry.reward)) {
      const parsedDuration = parseMuteDuration(entry.reward);
      if (parsedDuration) {
        entry.type = "mute";
        entry.parsedDuration = parsedDuration;
      }
      // If no duration found, leave type as null so the preview
      // shows ❌ and the reward won't be distributed.
    }
  }

  const unmatched = analyzed.filter((entry) => entry.type === null);
  if (unmatched.length > 0) {
    const items = await fetchGuildItems(prisma, guildId);
    for (const entry of unmatched) {
      const item = findItemMatch(items, entry.reward);
      if (item) {
        entry.type = "item";
        entry.matchedItem = item;
      }
    }
  }

  return analyzed;
};

export const formatRewardPreview = (reward: AnalyzedReward): string => {
  const { amount, reward: rewardText, type, parsedValue, parsedDuration, matchedItem } = reward;

  const marker =
    type === null
      ? "❌"
      : type === "currency"
        ? `✅ ${parsedValue !== null ? parsedValue : ""} ${KAPSLE_UNIT}`.trim()
        : type === "mute"
          ? `✅ ${parsedDuration ? formatDuration(parsedDuration) : ""} mute`.trim()
          : `✅ ${matchedItem?.name ?? ""} id:${matchedItem?.id ?? ""}`.trim();

  return `${amount}x ${rewardText} (${marker})`;
};

export const formatFixedReward = (
  reward: AnalyzedReward,
): { amount: number; reward: string; type: RewardType | null } => {
  const fixedText =
    reward.type === "currency" && reward.parsedValue !== null
      ? `${reward.parsedValue} ${KAPSLE_UNIT}`
      : reward.type === "mute" && reward.parsedDuration
        ? `${formatDuration(reward.parsedDuration)} mute`
        : reward.type === "item" && reward.matchedItem
          ? reward.matchedItem.name
          : reward.reward;

  return { amount: reward.amount, reward: fixedText, type: reward.type };
};

/**
 * Serialized shape persisted for each giveaway reward. Structured payout values
 * are resolved here (at creation) so distributing the reward doesn't need to
 * parse the display text or fuzzy-match items again at payout time.
 */
export type PersistedReward = {
  amount: number;
  reward: string;
  type: RewardType | null;
  currencyValue: number | null;
  muteDurationSeconds: number | null;
  itemId: number | null;
};

export const toPersistedReward = (
  reward: AnalyzedReward,
  fixed: boolean = true,
): PersistedReward => {
  const formatted = formatFixedReward(reward);

  // When `fixed` is false, the caller has confirmed the reward is already
  // correct — keep the original display text. When `fixed` is true, the
  // caller accepts the analyzer's corrected text (e.g. "1,5k pkt" -> "1500 pkt").
  const rewardText = fixed ? formatted.reward : reward.reward;

  return {
    amount: formatted.amount,
    reward: rewardText,
    type: formatted.type,
    currencyValue: reward.type === "currency" ? (reward.parsedValue ?? null) : null,
    muteDurationSeconds:
      reward.type === "mute" && reward.parsedDuration
        ? durationToSeconds(reward.parsedDuration)
        : null,
    itemId: reward.type === "item" ? (reward.matchedItem?.id ?? null) : null,
  };
};
