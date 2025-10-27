import { type ExtendedPrismaClient, Prisma } from "@hashira/db";
import type { ActionEffect } from "./combatLog";

export const seedDefaultPlayerAbilities = async (prisma: ExtendedPrismaClient) => {
  const abilities = [
    {
      name: "Cios",
      description: "Zwykły atak",
      abilityType: "attack",
      power: 10,
      cooldown: 0,
      canTargetPlayers: false,
      canTargetSelf: false,
      isAoe: false,
      isDefault: true,
      effects: Prisma.JsonNull,
    },
    {
      name: "Heavy Blow",
      description: "Silny cios, który zadaje dodatkowe obrażenia",
      abilityType: "attack",
      power: 18,
      cooldown: 3,
      canTargetPlayers: false,
      canTargetSelf: false,
      isAoe: false,
      isDefault: true,
      effects: Prisma.JsonNull,
    },
    {
      name: "Bandaż",
      description: "Ulecz się lub sojusznika",
      abilityType: "heal",
      power: 20,
      cooldown: 3,
      canTargetPlayers: true,
      canTargetSelf: true,
      isAoe: false,
      isDefault: true,
      effects: Prisma.JsonNull,
    },
    {
      name: "Modlitwa",
      description: "Ulecz wszystkich sojuszników w okolicy",
      abilityType: "heal",
      power: 12,
      cooldown: 5,
      canTargetPlayers: false,
      canTargetSelf: true,
      isAoe: true,
      isDefault: true,
      effects: Prisma.JsonNull,
    },
    {
      name: "Tarcza Szmato",
      description: "Zyskaj ochronę i odbij obrażenia",
      abilityType: "defend",
      power: 0,
      cooldown: 4,
      canTargetPlayers: false,
      canTargetSelf: true,
      isAoe: false,
      isDefault: true,
      effects: { shield: 15, thorns: 5 },
    },
    {
      name: "Wzmocnienie",
      description: "Zwiększ swoją i sojuszników obronę",
      abilityType: "buff",
      power: 0,
      cooldown: 6,
      canTargetPlayers: false,
      canTargetSelf: true,
      isAoe: true,
      isDefault: true,
      effects: { shield: 10 },
    },
    {
      name: "Zatruta Strzała",
      description: "Atak, który zatruwa cel",
      abilityType: "attack",
      power: 8,
      cooldown: 2,
      canTargetPlayers: false,
      canTargetSelf: false,
      isAoe: false,
      isDefault: true,
      effects: { poison: 3 },
    },
    {
      name: "Płonąca Pięść",
      description: "Atak, który podpala cel",
      abilityType: "attack",
      power: 12,
      cooldown: 3,
      canTargetPlayers: false,
      canTargetSelf: false,
      isAoe: false,
      isDefault: true,
      effects: { burn: 4 },
    },
    {
      name: "Wampirzy Sztylet",
      description: "Atak, który kradnie życie i leczy cię za 30% zadanych obrażeń",
      abilityType: "attack",
      power: 14,
      cooldown: 4,
      canTargetPlayers: false,
      canTargetSelf: false,
      isAoe: false,
      isDefault: true,
      effects: { lifesteal: 0.3 },
    },
    {
      name: "Osłabienie",
      description: "Obniża atak celu",
      abilityType: "debuff",
      power: 0,
      cooldown: 3,
      canTargetPlayers: false,
      canTargetSelf: false,
      isAoe: false,
      isDefault: true,
      effects: { weakness: 5 },
    },
    {
      name: "Odwaga",
      description: "Zwiększa atak wszystkich sojuszników",
      abilityType: "buff",
      power: 0,
      cooldown: 5,
      canTargetPlayers: false,
      canTargetSelf: true,
      isAoe: true,
      isDefault: true,
      effects: { strength: 6 },
    },
    {
      name: "Berserk",
      description: "Zwiększa twój atak, ale pozwala ci atakować sojuszników!",
      abilityType: "buff",
      power: 0,
      cooldown: 12,
      canTargetPlayers: false,
      canTargetSelf: true,
      isAoe: false,
      isDefault: true,
      effects: { berserk: true, strength: 5 },
    },
  ] as const;

  for (const ability of abilities) {
    await prisma.halloween2025PlayerAbility.upsert({
      where: { name: ability.name },
      create: ability,
      update: ability,
    });

    console.log(`Seeded player ability: ${ability.name}`);
  }
};

export const seedExampleMonsters = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
) => {
  const wereraccoon = await prisma.halloween2025Monster.upsert({
    where: { name: "Szopołak" },
    create: {
      name: "Szopołak",
      weight: 100,
      enabled: true,
      guildId,
      image: "https://i.imgur.com/ihzBYx8.png",
      baseHp: 60,
      baseAttack: 7,
      baseDefense: 3,
    },
    update: {
      guildId,
      baseHp: 60,
      baseAttack: 7,
      baseDefense: 3,
    },
  });

  console.log(`Created monster: ${wereraccoon.name} for guild ${guildId}`);

  const wereraccoonActions = [
    {
      monsterId: wereraccoon.id,
      name: "Drapnięcie",
      description: "Szybki atak pazurami",
      actionType: "attack",
      power: 8,
      weight: 100,
      cooldown: 0,
      isAoe: false,
      canTargetSelf: false,
      effects: Prisma.JsonNull,
    },
    {
      monsterId: wereraccoon.id,
      name: "Ugryzienie",
      description: "Silne ugryzienie, które leczy Szopołaka za 30% zadanych obrażeń",
      actionType: "attack",
      power: 13,
      weight: 100,
      cooldown: 0,
      isAoe: false,
      canTargetSelf: false,
      effects: { lifesteal: 0.3 },
    },
    {
      monsterId: wereraccoon.id,
      name: "Rzut śmieciami",
      description: "Rzuca śmieciami, aby osłabić wrogów",
      actionType: "debuff",
      power: 0,
      weight: 50,
      cooldown: 3,
      isAoe: true,
      canTargetSelf: false,
      effects: { weakness: 3, poison: 6 },
    },
  ] as const;

  for (const action of wereraccoonActions) {
    await prisma.halloween2025MonsterAction.upsert({
      where: { monsterId_name: { monsterId: action.monsterId, name: action.name } },
      create: action,
      update: action,
    });

    console.log(
      `Seeded action: ${action.name} for monster ${wereraccoon.name} in guild ${guildId}`,
    );
  }

  const fishermanGhost = await prisma.halloween2025Monster.upsert({
    where: { name: "Duch Wędkarza" },
    create: {
      name: "Duch Wędkarza",
      weight: 80,
      enabled: true,
      guildId,
      image: "https://i.imgur.com/YbMVA5e.png",
      baseHp: 70,
      baseAttack: 6,
      baseDefense: 4,
    },
    update: {
      guildId,
      baseHp: 70,
      baseAttack: 6,
      baseDefense: 4,
    },
  });

  console.log(`Created monster: ${fishermanGhost.name} for guild ${guildId}`);

  const fishermanGhostActions = [
    {
      monsterId: fishermanGhost.id,
      name: "Zarzutka",
      description:
        "Wszyscy atakujący zostają trafieni haczykiem i łapią się na zarzutkę.",
      actionType: "attack",
      power: 9,
      weight: 100,
      cooldown: 6,
      isAoe: true,
      canTargetSelf: false,
      effects: { stun: true, weakness: 4, strength: 4 } satisfies ActionEffect,
    },
    {
      monsterId: fishermanGhost.id,
      name: "Połów",
      description: "Przywołuje ryby, które atakują wszystkich przeciwników.",
      actionType: "attack",
      power: 11,
      weight: 80,
      cooldown: 4,
      isAoe: true,
      canTargetSelf: false,
      effects: Prisma.JsonNull,
    },
    {
      monsterId: fishermanGhost.id,
      name: "Ektoplazma",
      description: "Leczy ducha i zwiększa jego obronę.",
      actionType: "heal",
      power: 18,
      weight: 100,
      cooldown: 10,
      isAoe: false,
      canTargetSelf: true,
      effects: { regen: 5 } satisfies ActionEffect,
    },
  ] as const;

  for (const action of fishermanGhostActions) {
    await prisma.halloween2025MonsterAction.upsert({
      where: { monsterId_name: { monsterId: action.monsterId, name: action.name } },
      create: action,
      update: action,
    });

    console.log(
      `Seeded action: ${action.name} for monster ${fishermanGhost.name} in guild ${guildId}`,
    );
  }

  const zombieCat = await prisma.halloween2025Monster.upsert({
    where: { name: "Zombie Bruno" },
    create: {
      name: "Zombie Bruno",
      weight: 90,
      enabled: true,
      guildId,
      image: "https://i.imgur.com/KUvDKvi.png",
      baseHp: 55,
      baseAttack: 9,
      baseDefense: 2,
      baseSpeed: 20,
    },
    update: {
      guildId,
      baseHp: 55,
      baseAttack: 9,
      baseDefense: 2,
      baseSpeed: 20,
    },
  });

  console.log(`Created monster: ${zombieCat.name} for guild ${guildId}`);

  const zombieCatActions = [
    {
      monsterId: zombieCat.id,
      name: "Pazur Zombie",
      description: "Atak pazurami, który może zatruć cel.",
      actionType: "attack",
      power: 10,
      weight: 100,
      cooldown: 0,
      isAoe: false,
      canTargetSelf: false,
      effects: { poison: 4 } satisfies ActionEffect,
    },
    {
      monsterId: zombieCat.id,
      name: "Kradzież Czasu",
      description: "Uderza wroga, nadaje stun i zabiera trochę życia.",
      actionType: "debuff",
      power: 7,
      weight: 80,
      cooldown: 4,
      isAoe: false,
      canTargetSelf: false,
      effects: { stun: true, lifesteal: 0.4 } satisfies ActionEffect,
    },
    {
      monsterId: zombieCat.id,
      name: "Furia Kota",
      description: "Zwiększa atak Zombie Bruno kosztem jego obrony.",
      actionType: "buff",
      power: 0,
      weight: 100,
      cooldown: 5,
      isAoe: false,
      canTargetSelf: true,
      effects: { strength: 6, shield: -4 } satisfies ActionEffect,
    },
    {
      monsterId: zombieCat.id,
      name: "Zaraźliwy Pazur",
      description: "Atak pazurami, który zatruwa wszystkich wrogów.",
      actionType: "attack",
      power: 8,
      weight: 80,
      cooldown: 6,
      isAoe: true,
      canTargetSelf: false,
      effects: { poison: 3 } satisfies ActionEffect,
    },
  ] as const;

  for (const action of zombieCatActions) {
    await prisma.halloween2025MonsterAction.upsert({
      where: { monsterId_name: { monsterId: action.monsterId, name: action.name } },
      create: action,
      update: action,
    });

    console.log(
      `Seeded action: ${action.name} for monster ${zombieCat.name} in guild ${guildId}`,
    );
  }

  const harpy = await prisma.halloween2025Monster.upsert({
    where: { name: "Harpia" },
    create: {
      name: "Harpia",
      weight: 70,
      enabled: true,
      guildId,
      image: "https://i.imgur.com/kQvkEzI.png",
      baseHp: 65,
      baseAttack: 8,
      baseDefense: 3,
      baseSpeed: 50,
    },
    update: {
      guildId,
      baseHp: 65,
      baseAttack: 8,
      baseDefense: 3,
      baseSpeed: 50,
    },
  });

  console.log(`Created monster: ${harpy.name} for guild ${guildId}`);

  const harpyActions = [
    {
      monsterId: harpy.id,
      name: "Niepoprawne korzystanie z mikrofonu",
      description: "Atak dźwiękowy, który ogłusza cel.",
      actionType: "attack",
      power: 9,
      weight: 100,
      cooldown: 0,
      isAoe: false,
      canTargetSelf: false,
      effects: { stun: true } satisfies ActionEffect,
    },
    {
      monsterId: harpy.id,
      name: "Podmuch",
      description:
        "Silny podmuch wiatru, który zadaje obrażenia wszystkim przeciwnikom.",
      actionType: "attack",
      power: 11,
      weight: 80,
      cooldown: 4,
      isAoe: true,
      canTargetSelf: false,
      effects: Prisma.JsonNull,
    },
  ] as const;

  for (const action of harpyActions) {
    await prisma.halloween2025MonsterAction.upsert({
      where: { monsterId_name: { monsterId: action.monsterId, name: action.name } },
      create: action,
      update: action,
    });

    console.log(
      `Seeded action: ${action.name} for monster ${harpy.name} in guild ${guildId}`,
    );
  }

  const possesedDoll = await prisma.halloween2025Monster.upsert({
    where: { name: "Opętana Lalka" },
    create: {
      name: "Opętana Lalka",
      weight: 60,
      enabled: false,
      guildId,
      image: "https://i.imgur.com/qQObiqd.png",
      baseHp: 45,
      baseAttack: 5,
      baseDefense: 3,
      baseSpeed: 40,
    },
    update: {
      enabled: false,
      guildId,
      baseHp: 45,
      baseAttack: 5,
      baseDefense: 3,
      baseSpeed: 40,
    },
  });

  console.log(`Created monster: ${possesedDoll.name} for guild ${guildId}`);

  const possesedDollActions = [
    {
      monsterId: possesedDoll.id,
      name: "Dźgnięcie",
      description: "Szybki atak nożem.",
      actionType: "attack",
      power: 9,
      weight: 100,
      cooldown: 0,
      isAoe: false,
      canTargetSelf: false,
      effects: Prisma.JsonNull,
    },
    {
      monsterId: possesedDoll.id,
      name: "Złość",
      description: "Zwiększa swój atak.",
      actionType: "buff",
      power: 0,
      weight: 100,
      cooldown: 2,
      isAoe: false,
      canTargetSelf: true,
      effects: { strength: 3 } satisfies ActionEffect,
    },
  ] as const;

  for (const action of possesedDollActions) {
    await prisma.halloween2025MonsterAction.upsert({
      where: { monsterId_name: { monsterId: action.monsterId, name: action.name } },
      create: action,
      update: action,
    });

    console.log(
      `Seeded action: ${action.name} for monster ${possesedDoll.name} in guild ${guildId}`,
    );
  }

  const succubus = await prisma.halloween2025Monster.upsert({
    where: { name: "Sukkub" },
    create: {
      name: "Sukkub",
      weight: 40,
      enabled: false,
      guildId,
      image: "https://i.imgur.com/clOhBpu.png",
      baseHp: 100,
      baseAttack: 14,
      baseDefense: 5,
    },
    update: {
      enabled: false,
      guildId,
      baseHp: 100,
      baseAttack: 14,
      baseDefense: 5,
    },
  });

  console.log(`Created monster: ${succubus.name} for guild ${guildId}`);

  const succubusActions = [
    {
      monsterId: succubus.id,
      name: "Uwodzenie",
      description: "Zmniejsza atak i obronę celu.",
      actionType: "buff",
      power: 0,
      weight: 100,
      cooldown: 3,
      isAoe: false,
      canTargetSelf: false,
      effects: { weakness: 2, shield: -2 } satisfies ActionEffect,
    },
    {
      monsterId: succubus.id,
      name: "Pocałunek Sukkuba",
      description: "Atak, który leczy Sukkuba za 40% zadanych obrażeń.",
      actionType: "attack",
      power: 16,
      weight: 100,
      cooldown: 0,
      isAoe: false,
      canTargetSelf: false,
      effects: { lifesteal: 0.4 } satisfies ActionEffect,
    },
    {
      monsterId: succubus.id,
      name: "Piekielne Selfie",
      description: "Zadaje obrażenia wszystkim przeciwnikom i nakłada efekt burn.",
      actionType: "attack",
      power: 14,
      weight: 80,
      cooldown: 8,
      isAoe: true,
      canTargetSelf: false,
      effects: { burn: 5 } satisfies ActionEffect,
    },
  ] as const;

  for (const action of succubusActions) {
    await prisma.halloween2025MonsterAction.upsert({
      where: { monsterId_name: { monsterId: action.monsterId, name: action.name } },
      create: action,
      update: action,
    });
  }
};

export const seedHalloweenCombatSystem = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
) => {
  await seedDefaultPlayerAbilities(prisma);
  await seedExampleMonsters(prisma, guildId);
  console.log("✅ Halloween 2025 combat system seeded successfully");
};
