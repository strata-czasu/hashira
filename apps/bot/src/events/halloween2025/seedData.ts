import { type ExtendedPrismaClient, Prisma } from "@hashira/db";
import {
  MONSTER_TEMPLATES,
  type MonsterTemplate,
  PLAYER_ABILITIES,
} from "./monsterData";

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

    console.log(`Seeded player ability: ${ability.name}`);
  }
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

  console.log(`Created monster: ${monster.name} for guild ${guildId}`);

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

    console.log(
      `Seeded action: ${action.name} for monster ${monster.name} in guild ${guildId}`,
    );
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
};
