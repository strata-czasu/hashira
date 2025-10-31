import type { ExtendedPrismaClient } from "@hashira/db";
import {
  ContainerBuilder,
  DiscordjsErrorCodes,
  heading,
  type Message,
  type MessageCreateOptions,
  MessageFlags,
  type PublicThreadChannel,
  userMention,
} from "discord.js";
import { Effect } from "effect";
import { discordTry } from "../../util/discordTry";
import { splitLongContent } from "../../util/splitLongContent";
import type { TurnSnapshot } from "./combatLog";
import type { CombatResult } from "./combatService";

const createTurnDisplayComponents = (turnSnapshot: TurnSnapshot) => {
  const turnHeader = `## Tura ${turnSnapshot.turnNumber}`;

  if (turnSnapshot.turnNumber === 0) {
    const combatantStats = turnSnapshot.combatants.map((combatant) => {
      return [
        `### ${combatant.name}`,
        `- **HP**: ${combatant.stats.hp}/${combatant.stats.maxHp}`,
        `- **Atak**: ${combatant.stats.attack}`,
        `- **Obrona**: ${combatant.stats.defense}`,
        `- **Szybkość**: ${combatant.stats.speed}`,
      ].join("\n");
    });

    const content = `${turnHeader}\n\n${combatantStats.join("\n\n")}`;

    return [
      new ContainerBuilder().addTextDisplayComponents((td) => td.setContent(content)),
    ];
  }

  const combatantHpLines = turnSnapshot.combatants.map(
    (combatant) =>
      `- **${combatant.name}**: ${combatant.stats.hp}/${combatant.stats.maxHp} HP`,
  );

  const hpStatus = combatantHpLines.join("\n");
  const events = turnSnapshot.events
    .map((event) =>
      event.type === "turn_start" ? `\n${event.message}` : event.message,
    )
    .join("\n");

  const headerAndHp = `${turnHeader}\n\n${hpStatus}\n\n`;

  const eventChunks = splitLongContent(events, 4000 - headerAndHp.length);

  return eventChunks.map((eventChunk, index) => {
    const content =
      index === 0
        ? `${headerAndHp}${eventChunk}`
        : `## Tura ${turnSnapshot.turnNumber} (część ${index + 1}/${eventChunks.length})\n\n${eventChunk}`;

    return new ContainerBuilder().addTextDisplayComponents((td) =>
      td.setContent(content),
    );
  });
};

const sendToThread = Effect.fn("sendToThread")(function* (
  thread: PublicThreadChannel<false>,
  options: MessageCreateOptions,
) {
  yield* Effect.tryPromise(() => thread.send(options));
});

export const sendCombatlog = Effect.fn("sendCombatlog")(function* (
  prisma: ExtendedPrismaClient,
  message: Message,
  fight: CombatResult | null,
) {
  const thread = yield* Effect.tryPromise(() =>
    discordTry(
      () => message.startThread({ name: "Combat Log" }),
      [DiscordjsErrorCodes.MessageExistingThread],
      () => message.thread as PublicThreadChannel<false>,
    ),
  );

  if (!fight) {
    return yield* sendToThread(thread, {
      content: "Nie było uczestników, więc potwór uciekł.",
    });
  }

  for (const turnSnapshot of fight.state.turnSnapshots) {
    const turnComponents = createTurnDisplayComponents(turnSnapshot);

    for (const turnComponent of turnComponents) {
      yield* sendToThread(thread, {
        components: [turnComponent],
        flags: MessageFlags.IsComponentsV2,
      });
      yield* Effect.sleep("1 second");
    }
    yield* Effect.sleep("5 seconds");
  }

  yield* sendToThread(thread, {
    components: [
      new ContainerBuilder().addTextDisplayComponents((td) =>
        td.setContent(
          `## Wynik walki\n\n${
            fight.state.result === "monster_captured"
              ? "Potwór został pojmany!"
              : "Potwór uciekł!"
          }`,
        ),
      ),
    ],
    flags: MessageFlags.IsComponentsV2,
  });

  const loot = yield* Effect.tryPromise(() =>
    prisma.halloween2025MonsterLoot.findMany({
      where: { spawnId: fight.spawn.id },
      select: { rank: true, damageDealt: true, userId: true },
      orderBy: { rank: "asc" },
    }),
  );

  if (loot.length === 0) return;

  const lines = [
    heading(`Rozdanie lootu`),
    "",
    "Loot został przydzielony uczestnikom walki według zadanych obrażeń:",
    "",
    ...loot.map(
      (l) => `${l.rank}. ${userMention(l.userId)} - ${l.damageDealt} obrażeń`,
    ),
  ];

  yield* sendToThread(thread, {
    components: [
      new ContainerBuilder().addTextDisplayComponents((td) =>
        td.setContent(lines.join("\n")),
      ),
    ],
    flags: MessageFlags.IsComponentsV2,
  });

  const winnerIds = loot.map((l) => l.userId);

  yield* sendToThread(thread, {
    content: winnerIds.map((id) => userMention(id)).join(", "),
    allowedMentions: { users: winnerIds },
  });
});
