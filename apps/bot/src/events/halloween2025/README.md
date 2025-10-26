# Halloween 2025 Combat System - Implementation Guide

## Quick Start

### 1. Run Database Migration

```bash
bun prisma-migrate-dev
```

This will create all necessary tables for the combat system.

### 2. Seed Default Data

Add to your main seed file or run directly:

```typescript
import { seedHalloweenCombatSystem } from "./apps/bot/src/events/halloween2025/seedData";

// In your seed script
await seedHalloweenCombatSystem(prisma, "YOUR_GUILD_ID");
```

This creates:
- 12 default player abilities (attacks, heals, buffs, debuffs)
- 3 example monsters (Goblin Scout, Fire Demon, Ancient Lich)
- All monster actions configured

### 3. Integration Example

Here's how to integrate combat into the spawn system:

```typescript
// In halloween2025/index.ts or a separate message queue handler

import { CombatService } from "./combatService";
import { PrismaCombatRepository } from "./combatRepository";
import { createCombatEmbed, formatCombatStatsEmbed } from "./combatDisplay";

// Message queue handler for when spawn expires
messageQueue.registerHandler("halloween2025endSpawn", async ({ spawnId }, tx) => {
  // 1. Create service with repository
  const repository = new PrismaCombatRepository(tx);
  const combatService = new CombatService(repository);

  // 2. Execute combat
  const result = await combatService.executeCombat(spawnId, 50);

  if (!result) {
    // No participants or spawn not found
    return;
  }

  // 3. Send results to Discord channel
  const channel = await client.channels.fetch(result.spawn.channelId);
  if (!channel?.isTextBased()) return;

  const resultEmbed = createCombatEmbed(result.state, result.monster.name, true);
  const statsEmbed = formatCombatStatsEmbed(
    result.state.events,
    new Map(Array.from(result.state.combatants.entries()).map(([id, c]) => [id, { name: c.name }]))
  );

  await channel.send({
    content: result.state.result === "monster_captured"
      ? `🎉 The monster has been captured by <@${result.state.winnerUserId}>!`
      : `😔 The monster escaped...`,
    embeds: [resultEmbed, statsEmbed]
  });
});
```

## Architecture

### File Structure

```
apps/bot/src/events/halloween2025/
├── index.ts              # Main event module, spawn system
├── combatLog.ts          # Core combat engine (simulation logic)
├── combatDisplay.ts      # Discord formatting utilities
├── seedData.ts           # Default abilities and example monsters
├── COMBAT_SYSTEM.md      # Detailed design documentation
└── README.md             # This file
```

### Database Schema

```
Halloween2025Monster (monster templates)
  ├── baseHp, baseAttack, baseDefense
  └── Halloween2025MonsterAction[] (configurable abilities)

Halloween2025MonsterSpawn (individual spawn instances)
  ├── combatState: "pending" | "in_progress" | "completed_*"
  ├── Halloween2025MonsterCatchAttempt[] (who tried to catch)
  └── Halloween2025CombatLog (combat simulation results)

Halloween2025PlayerAbility (global player skills)
  └── Defines all available player actions

Halloween2025CombatLog (per-spawn combat record)
  ├── events: CombatEvent[] (full combat history)
  ├── combatState: JSON (final HP, buffs, etc.)
  └── result, winnerUserId
```

## Creating Custom Monsters

### Via Admin Command

Already implemented in `index.ts`:

```typescript
/halloween-admin add-monster name:"Shadow Wraith" weight:30 image-url:"https://..."
```

### Adding Actions Programmatically

```typescript
await prisma.halloween2025MonsterAction.create({
  data: {
    monsterId: monster.id,
    name: "Dark Pulse",
    description: "Weakens all enemies",
    actionType: "aoe_attack",
    power: 10,
    weight: 70,
    cooldown: 2,
    isAoe: true,
    canTargetSelf: false,
    effects: { weakness: 4, poison: 2 }
  }
});
```

### Action Type Reference

| Type | Description | Typical Use |
|------|-------------|-------------|
| `attack` | Single-target damage | Basic attacks |
| `aoe_attack` | Multi-target damage | Breath weapons, explosions |
| `defend` | Apply defensive buffs | Shield abilities |
| `heal` | Restore HP | Regeneration |
| `buff` | Positive status effects | Strength, regen |
| `debuff` | Negative status effects | Weakness, poison |
| `special` | Unique mechanics | Custom behaviors |

## Creating Custom Player Abilities

```typescript
await prisma.halloween2025PlayerAbility.create({
  data: {
    name: "Whirlwind Strike",
    description: "Attack all enemies at once",
    abilityType: "attack",
    power: 8,
    cooldown: 4,
    canTargetPlayers: false,
    canTargetSelf: false,
    isAoe: true,
    isDefault: true,
    effects: null
  }
});
```

### Special Mechanics

**Friendly Fire:**
```typescript
{
  name: "Chaos Bolt",
  canTargetPlayers: true,  // Can accidentally hit allies!
  effects: { berserk: true }
}
```

**Lifesteal:**
```typescript
{
  name: "Vampiric Touch",
  effects: { lifesteal: 0.4 }  // Heal for 40% of damage dealt
}
```

**Multi-Effect Combos:**
```typescript
{
  name: "Toxic Inferno",
  effects: {
    burn: 5,
    poison: 3,
    weakness: 2
  }
}
```

## Testing Combat Simulations

### Unit Test Example

```typescript
import { describe, it, expect } from "bun:test";
import { initializeCombatState, simulateCombat } from "./combatLog";

describe("Combat System", () => {
  it("should capture weak monster", async () => {
    const state = initializeCombatState(
      {
        id: 1,
        name: "Test Goblin",
        baseHp: 30,
        baseAttack: 5,
        baseDefense: 2,
        actions: [{
          id: 1,
          name: "Weak Attack",
          description: "",
          actionType: "attack",
          power: 5,
          weight: 100,
          cooldown: 0,
          isAoe: false,
          canTargetSelf: false,
        }]
      },
      [
        { id: "user1", name: "Player 1" },
        { id: "user2", name: "Player 2" }
      ]
    );

    const abilities = [{
      id: 1,
      name: "Strike",
      description: "",
      abilityType: "attack" as const,
      power: 10,
      cooldown: 0,
      canTargetPlayers: false,
      canTargetSelf: false,
      isAoe: false,
    }];

    const result = await simulateCombat(state, abilities, 20);

    expect(result.isComplete).toBe(true);
    expect(result.result).toBe("monster_captured");
    expect(result.winnerUserId).toBeTruthy();
  });
});
```

### Manual Testing in Discord

1. Add test monster via admin command
2. Trigger spawn manually
3. Click catch button with multiple accounts
4. Wait for combat to resolve
5. Check combat log embed for proper formatting

## Balancing Guidelines

### Monster Difficulty Tiers

**Easy (Solo-able):**
- HP: 40-80
- Attack: 5-10
- Defense: 2-5
- Max 2 actions, simple mechanics

**Medium (2-3 players recommended):**
- HP: 100-150
- Attack: 10-15
- Defense: 5-8
- 3-4 actions, some AOE/status effects

**Hard (4+ players recommended):**
- HP: 180-250
- Attack: 15-22
- Defense: 8-12
- 5+ actions, complex combos, lifesteal/shields

**Boss (Group required):**
- HP: 300+
- Attack: 20-30
- Defense: 12-18
- Multiple powerful AOE, status effects, healing

### Combat Duration Targets

- Easy: 5-10 turns
- Medium: 10-20 turns  
- Hard: 20-35 turns
- Boss: 30-50 turns

Use the `maxTurns` parameter to enforce timeouts (default: 50).

## Reward Integration

```typescript
const rewardPlayer = async (
  tx: PrismaTransaction,
  userId: string,
  monster: { name: string; baseHp: number }
) => {
  // Scale rewards by monster difficulty
  const baseReward = Math.floor(monster.baseHp / 10);
  
  // Add currency
  await addBalance(tx, userId, monster.guildId, baseReward);
  
  // Add special items
  if (Math.random() < 0.2) { // 20% chance
    await tx.inventoryItem.create({
      data: {
        userId,
        itemId: HALLOWEEN_RARE_ITEM_ID,
        quantity: 1,
      }
    });
  }
  
  // Track statistics
  await tx.user.update({
    where: { id: userId },
    data: {
      // Add custom stat tracking fields as needed
    }
  });
};
```

## Future Enhancements Roadmap

### Phase 1: Core Improvements
- [ ] Player class system (Warrior, Mage, Healer)
- [ ] Equipment slots (weapon, armor, accessory)
- [ ] Passive abilities (always active)

### Phase 2: Advanced Features
- [ ] Monster phases (transform at 50% HP)
- [ ] Team combo abilities
- [ ] Achievement system
- [ ] Leaderboards (most captures, damage dealt, etc.)

### Phase 3: Interactive Combat
- [ ] Manual action selection (vs auto-combat)
- [ ] Turn timer with buttons
- [ ] Spectator mode
- [ ] Replay system

### Phase 4: Meta Systems
- [ ] Seasonal monsters with unique drops
- [ ] Monster breeding/fusion
- [ ] PvP arena using combat engine
- [ ] Raid bosses (10+ players)

## Troubleshooting

### Combat Never Ends
- Check monster HP isn't too high relative to player damage
- Verify `maxTurns` parameter is set appropriately
- Ensure heal actions aren't too strong

### One-Shot Kills
- Monster defense too low
- Player attack abilities too powerful
- Consider adding shields/buffs to monster actions

### No One Wins
- Increase player HP (currently 50 default)
- Decrease monster attack
- Add more healing abilities

### Abilities Not Using
- Check cooldown values aren't too high
- Verify AI selection logic in `selectPlayerAction`
- Ensure abilities have appropriate weights

## API Reference

See `COMBAT_SYSTEM.md` for complete type definitions and algorithm details.

### Key Functions

```typescript
// Initialize a new combat
initializeCombatState(monster, players): CombatState

// Run simulation
simulateCombat(state, abilities, maxTurns?): Promise<CombatState>

// Save to database
saveCombatState(prisma, spawnId, state): Promise<void>

// Display helpers
createCombatEmbed(state, monsterName, includeFullLog?): EmbedBuilder
formatCombatStatsEmbed(events, combatants): EmbedBuilder
```

## Support

For questions or issues:
1. Check `COMBAT_SYSTEM.md` for design details
2. Review seed data examples in `seedData.ts`
3. Test combat logic in isolation with unit tests
4. Verify database schema is up-to-date with migrations
