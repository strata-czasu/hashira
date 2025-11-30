import { type ExtendedPrismaClient, Prisma } from "@hashira/db";
import { USER_IDS } from "../../specializedConstants";
import { ensureUserExists } from "../../util/ensureUsersExist";
import {
  MONSTER_TEMPLATES,
  type MonsterTemplate,
  PLAYER_ABILITIES,
} from "./monsterData";

export const TOKENY_CURRENCY = {
  name: "Tokeny",
  symbol: "T",
} as const;

export const seedTokenyCurrency = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
) => {
  await ensureUserExists(prisma, USER_IDS.Defous);
  await prisma.currency.createMany({
    data: {
      guildId,
      name: TOKENY_CURRENCY.name,
      symbol: TOKENY_CURRENCY.symbol,
      createdBy: USER_IDS.Defous,
    },
    skipDuplicates: true,
  });

  console.log(`Seeding Tokeny currency completed for guild ${guildId}`);
};

export const seedDefaultPlayerAbilities = async (prisma: ExtendedPrismaClient) => {
  for (const ability of PLAYER_ABILITIES) {
    await prisma.halloween2025PlayerAbility.upsert({
      where: { name: ability.name },
      create: {
        ...ability,
        effects: "effects" in ability ? ability.effects : Prisma.JsonNull,
      },
      update: {
        ...ability,
        effects: "effects" in ability ? ability.effects : Prisma.JsonNull,
      },
    });
  }

  console.log(`Seeding default player abilities completed`);
};

async function seedMonster(
  prisma: ExtendedPrismaClient,
  template: MonsterTemplate,
  guildId: string,
) {
  const monster = await prisma.halloween2025Monster.upsert({
    where: { name_guildId: { guildId, name: template.name } },
    create: {
      name: template.name,
      weight: template.weight,
      enabled: template.enabled,
      image: template.image,
      baseHp: template.baseHp,
      baseAttack: template.baseAttack,
      baseDefense: template.baseDefense,
      ...(template.baseSpeed !== undefined && { baseSpeed: template.baseSpeed }),
      guildId,
    },
    update: {
      guildId,
      weight: template.weight,
      enabled: template.enabled,
      baseHp: template.baseHp,
      baseAttack: template.baseAttack,
      baseDefense: template.baseDefense,
      ...(template.baseSpeed !== undefined && { baseSpeed: template.baseSpeed }),
    },
  });

  for (const action of template.actions) {
    await prisma.halloween2025MonsterAction.upsert({
      where: { monsterId_name: { monsterId: monster.id, name: action.name } },
      create: {
        monsterId: monster.id,
        ...action,
        effects: "effects" in action ? action.effects : Prisma.JsonNull,
      },
      update: {
        ...action,
        effects: "effects" in action ? action.effects : Prisma.JsonNull,
      },
    });
  }
}

export const seedMonstersForGuild = async (
  prisma: ExtendedPrismaClient,
  guildId: string,
) => {
  await seedMonster(prisma, MONSTER_TEMPLATES.wereraccoon, guildId);
  await seedMonster(prisma, MONSTER_TEMPLATES.fishermanGhost, guildId);
  await seedMonster(prisma, MONSTER_TEMPLATES.zombieCat, guildId);
  await seedMonster(prisma, MONSTER_TEMPLATES.harpy, guildId);
  await seedMonster(prisma, MONSTER_TEMPLATES.possessedDoll, guildId);
  await seedMonster(prisma, MONSTER_TEMPLATES.succubus, guildId);
  await seedMonster(prisma, MONSTER_TEMPLATES.cerber, guildId);
  await seedMonster(prisma, MONSTER_TEMPLATES.vampire, guildId);
  await seedMonster(prisma, MONSTER_TEMPLATES.headlessHorseman, guildId);

  console.log(`Seeding monsters completed for guild ${guildId}`);
};
