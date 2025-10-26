import type { ExtendedPrismaClient } from "@hashira/db";

/**
 * Seed data for Halloween 2025 combat system
 * Run this to populate default monsters, actions, and player abilities
 */

export const seedDefaultPlayerAbilities = async (prisma: ExtendedPrismaClient) => {
  const abilities = [
    // Basic Attacks
    {
      name: "Strike",
      description: "A basic melee attack",
      abilityType: "attack",
      power: 10,
      cooldown: 0,
      canTargetPlayers: false,
      canTargetSelf: false,
      isAoe: false,
      isDefault: true,
      effects: null,
    },
    {
      name: "Heavy Blow",
      description: "A powerful strike that deals extra damage",
      abilityType: "attack",
      power: 18,
      cooldown: 3,
      canTargetPlayers: false,
      canTargetSelf: false,
      isAoe: false,
      isDefault: true,
      effects: null,
    },

    // Healing
    {
      name: "Bandage",
      description: "Heal yourself or an ally",
      abilityType: "heal",
      power: 20,
      cooldown: 3,
      canTargetPlayers: true,
      canTargetSelf: true,
      isAoe: false,
      isDefault: true,
      effects: null,
    },
    {
      name: "Prayer",
      description: "Heal all allies in the area",
      abilityType: "heal_aoe",
      power: 12,
      cooldown: 5,
      canTargetPlayers: false,
      canTargetSelf: true,
      isAoe: true,
      isDefault: true,
      effects: null,
    },

    // Defense
    {
      name: "Shield Wall",
      description: "Gain a protective shield and reflect damage",
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
      name: "Fortify",
      description: "Grant shields to all allies",
      abilityType: "buff",
      power: 0,
      cooldown: 6,
      canTargetPlayers: false,
      canTargetSelf: true,
      isAoe: true,
      isDefault: true,
      effects: { shield: 10 },
    },

    // Special Attacks
    {
      name: "Venom Strike",
      description: "Attack that poisons the target",
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
      name: "Flame Slash",
      description: "Attack that burns the target",
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
      name: "Vampiric Blade",
      description: "Lifesteal attack that heals you for 30% of damage dealt",
      abilityType: "attack",
      power: 14,
      cooldown: 4,
      canTargetPlayers: false,
      canTargetSelf: false,
      isAoe: false,
      isDefault: true,
      effects: { lifesteal: 0.3 },
    },

    // Buffs/Debuffs
    {
      name: "Weaken",
      description: "Reduce the target's attack power",
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
      name: "Battle Cry",
      description: "Increase all allies' attack power",
      abilityType: "buff",
      power: 0,
      cooldown: 5,
      canTargetPlayers: false,
      canTargetSelf: true,
      isAoe: true,
      isDefault: true,
      effects: { strength: 6 },
    },

    // Risky Abilities
    {
      name: "Berserk Rage",
      description: "Powerful attack but you might hit allies! Increases strength.",
      abilityType: "attack",
      power: 22,
      cooldown: 4,
      canTargetPlayers: true, // Can hit allies!
      canTargetSelf: false,
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
  }

  console.log(`Seeded ${abilities.length} player abilities`);
};

export const seedExampleMonsters = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
) => {
  // Example Monster 1: Goblin Scout (Easy)
  const goblin = await prisma.halloween2025Monster.upsert({
    where: { name: "Goblin Scout" },
    create: {
      name: "Goblin Scout",
      weight: 100,
      enabled: true,
      guildId,
      image: "https://example.com/goblin.png",
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

  const goblinActions = [
    {
      monsterId: goblin.id,
      name: "Rusty Dagger",
      description: "A quick stab with a rusty blade",
      actionType: "attack",
      power: 8,
      weight: 100,
      cooldown: 0,
      isAoe: false,
      canTargetSelf: false,
      effects: null,
    },
    {
      monsterId: goblin.id,
      name: "Dirty Trick",
      description: "Throws sand to weaken enemies",
      actionType: "debuff",
      power: 0,
      weight: 50,
      cooldown: 3,
      isAoe: false,
      canTargetSelf: false,
      effects: { weakness: 3 },
    },
  ];

  for (const action of goblinActions) {
    await prisma.halloween2025MonsterAction.upsert({
      where: { monsterId_name: { monsterId: action.monsterId, name: action.name } },
      create: action,
      update: action,
    });
  }

  // Example Monster 2: Fire Demon (Medium)
  const demon = await prisma.halloween2025Monster.upsert({
    where: { name: "Fire Demon" },
    create: {
      name: "Fire Demon",
      weight: 50,
      enabled: true,
      guildId,
      image: "https://example.com/demon.png",
      baseHp: 120,
      baseAttack: 12,
      baseDefense: 6,
    },
    update: {
      guildId,
      baseHp: 120,
      baseAttack: 12,
      baseDefense: 6,
    },
  });

  const demonActions = [
    {
      monsterId: demon.id,
      name: "Claw Strike",
      description: "A powerful claw attack",
      actionType: "attack",
      power: 15,
      weight: 80,
      cooldown: 0,
      isAoe: false,
      canTargetSelf: false,
      effects: null,
    },
    {
      monsterId: demon.id,
      name: "Fire Breath",
      description: "Breathes fire at all enemies, causing burn",
      actionType: "aoe_attack",
      power: 12,
      weight: 60,
      cooldown: 3,
      isAoe: true,
      canTargetSelf: false,
      effects: { burn: 5 },
    },
    {
      monsterId: demon.id,
      name: "Infernal Regeneration",
      description: "Heals over time",
      actionType: "heal",
      power: 15,
      weight: 40,
      cooldown: 4,
      isAoe: false,
      canTargetSelf: true,
      effects: { regen: 5 },
    },
  ];

  for (const action of demonActions) {
    await prisma.halloween2025MonsterAction.upsert({
      where: { monsterId_name: { monsterId: action.monsterId, name: action.name } },
      create: action,
      update: action,
    });
  }

  // Example Monster 3: Ancient Lich (Hard)
  const lich = await prisma.halloween2025Monster.upsert({
    where: { name: "Ancient Lich" },
    create: {
      name: "Ancient Lich",
      weight: 20,
      enabled: true,
      guildId,
      image: "https://example.com/lich.png",
      baseHp: 200,
      baseAttack: 18,
      baseDefense: 10,
    },
    update: {
      guildId,
      baseHp: 200,
      baseAttack: 18,
      baseDefense: 10,
    },
  });

  const lichActions = [
    {
      monsterId: lich.id,
      name: "Soul Drain",
      description: "Drains life force from a target",
      actionType: "attack",
      power: 20,
      weight: 70,
      cooldown: 0,
      isAoe: false,
      canTargetSelf: false,
      effects: { lifesteal: 0.5 },
    },
    {
      monsterId: lich.id,
      name: "Death Coil",
      description: "Poison all enemies",
      actionType: "aoe_attack",
      power: 10,
      weight: 60,
      cooldown: 2,
      isAoe: true,
      canTargetSelf: false,
      effects: { poison: 6 },
    },
    {
      monsterId: lich.id,
      name: "Bone Shield",
      description: "Creates a protective barrier and thorns",
      actionType: "defend",
      power: 0,
      weight: 50,
      cooldown: 4,
      isAoe: false,
      canTargetSelf: true,
      effects: { shield: 20, thorns: 8 },
    },
    {
      monsterId: lich.id,
      name: "Paralyzing Touch",
      description: "Stuns a target",
      actionType: "debuff",
      power: 8,
      weight: 40,
      cooldown: 5,
      isAoe: false,
      canTargetSelf: false,
      effects: { stun: true },
    },
    {
      monsterId: lich.id,
      name: "Cursed Flame",
      description: "Powerful attack with multiple debuffs",
      actionType: "attack",
      power: 15,
      weight: 30,
      cooldown: 4,
      isAoe: false,
      canTargetSelf: false,
      effects: { burn: 4, weakness: 4, poison: 3 },
    },
  ];

  for (const action of lichActions) {
    await prisma.halloween2025MonsterAction.upsert({
      where: { monsterId_name: { monsterId: action.monsterId, name: action.name } },
      create: action,
      update: action,
    });
  }

  console.log("Seeded 3 example monsters with their actions");
};

export const seedHalloweenCombatSystem = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
) => {
  await seedDefaultPlayerAbilities(prisma);
  await seedExampleMonsters(prisma, guildId);
  console.log("✅ Halloween 2025 combat system seeded successfully");
};
