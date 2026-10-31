import type { Halloween2026TotItem } from "@hashira/db";

export const TOT_EVENT_START = new Date("2026-10-30T23:00:00Z");
export const TOT_EVENT_END = new Date("2026-11-02T23:00:00Z");
export const TOT_EXCHANGE_START = new Date("2026-10-31T23:00:00Z");
export const TOT_TIMEZONE = "Europe/Warsaw";

export const TOT_KNOCK_COOLDOWN_MINUTES = 30;
export const TOT_HOST_COOLDOWN_MINUTES = 15;
export const TOT_PAIR_COOLDOWN_MINUTES = 120;
export const TOT_KNOCK_EXPIRY_MINUTES = 10;

export const TOT_MUTE_MINUTES = 5;
export const TOT_DOUBLE_MUTE_MINUTES = 3;
export const TOT_MUTE_IMMUNITY_MINUTES = 30;
export const TOT_DAILY_MUTE_LIMIT = 3;
export const TOT_MUTE_REASON = "Psikus (Halloween 2026)";

export const TOT_CANDIES_PER_KAPSEL = 5;

export const TOT_ITEM_LIMIT = 3;

type ItemDefinition = {
  readonly name: string;
  readonly accusative: string;
  readonly description: string;
  readonly price: number;
  readonly dropWeight: number;
  readonly limit: number;
  readonly usable: boolean;
};

export const TOT_ITEMS = {
  garlic: {
    name: "Czosnek",
    accusative: "czosnek",
    description: "Sam blokuje następne wyciszenie z psikusa.",
    price: 4,
    dropWeight: 25,
    limit: TOT_ITEM_LIMIT,
    usable: false,
  },
  broom: {
    name: "Miotła",
    accusative: "miotłę",
    description: "Pozwala od razu zapukać jeszcze raz.",
    price: 3,
    dropWeight: 20,
    limit: TOT_ITEM_LIMIT,
    usable: true,
  },
  mask: {
    name: "Maska",
    accusative: "maskę",
    description: "Następne pukanie jest anonimowe.",
    price: 3,
    dropWeight: 20,
    limit: TOT_ITEM_LIMIT,
    usable: true,
  },
  dice: {
    name: "Kostka losu",
    accusative: "kostkę losu",
    description: "Przy psikusie rzucasz dwa razy i bierzesz lepszy wynik.",
    price: 4,
    dropWeight: 15,
    limit: TOT_ITEM_LIMIT,
    usable: false,
  },
  lollipop: {
    name: "Zatruty lizak",
    accusative: "zatruty lizak",
    description: "Następna osoba, której dasz cukierka, dostaje wyciszenie zamiast słodyczy.",
    price: 5,
    dropWeight: 12,
    limit: TOT_ITEM_LIMIT,
    usable: true,
  },
  mirror: {
    name: "Lustro",
    accusative: "lustro",
    description: "Samo odbija następne wyciszenie do osoby, która je spowodowała.",
    price: 8,
    dropWeight: 8,
    limit: 2,
    usable: false,
  },
} as const satisfies Record<Halloween2026TotItem, ItemDefinition>;

export const TOT_ITEM_KEYS = Object.keys(TOT_ITEMS) as Halloween2026TotItem[];

export const formatTotItem = (item: Halloween2026TotItem) => TOT_ITEMS[item].name;

export const getTotDay = (at: Date) => {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: TOT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
  return new Date(`${key}T00:00:00Z`);
};

export const isTotEventOpen = (now: Date) => now >= TOT_EVENT_START && now < TOT_EVENT_END;
