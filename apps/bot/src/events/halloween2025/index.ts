import { Hashira } from "@hashira/core";
import type { ExtendedPrismaClient } from "@hashira/db";
import type { Client } from "discord.js";
import {
  Clock,
  Console,
  Context,
  Cron,
  DateTime,
  Effect,
  Layer,
  pipe,
  Schedule,
  Stream,
} from "effect";
import { PropertySignatureTransformation } from "effect/Schema";
import { base } from "../../base";
import { GUILD_IDS } from "../../specializedConstants";

export const HALLOWEEN_2025_CHANNELS = {
  [GUILD_IDS.Homik]: "1431437264612753408",
};

class PrismaReader extends Context.Tag("Prisma")<
  PrismaReader,
  { readonly getPrisma: Effect.Effect<ExtendedPrismaClient> }
>() {}

class ClientReader extends Context.Tag("Client")<
  ClientReader,
  { readonly getClient: Effect.Effect<Client<true>> }
>() {}

const zone = DateTime.zoneUnsafeMakeNamed("Europe/Warsaw");

// 12 PM Polish Time on October 25th, 2025
// const START_DATE = DateTime.unsafeMakeZoned({
//   year: 2025,
//   month: 10,
//   day: 25,
//   hours: 12,
//   minutes: 0,
//   seconds: 0,
//   zone,
// });
const START_DATE = DateTime.unsafeNow().pipe(DateTime.addDuration("1 seconds"));

const CRON = Cron.make({
  minutes: [],
  hours: [],
  days: [],
  months: [],
  weekdays: [],
  seconds: [0],
  tz: DateTime.zoneUnsafeMakeNamed("Europe/Warsaw"),
});

// const schedule = Schedule.cron(CRON);
const schedule = Schedule.fixed("2 second");

const program = Effect.repeat(
  Effect.gen(function* () {
    const today = yield* DateTime.now;
    const prismaReader = yield* PrismaReader;
    const prisma = yield* prismaReader.getPrisma;
    const clientReader = yield* ClientReader;
    const client = yield* clientReader.getClient;

    const todayActivity = yield* Effect.tryPromise(() =>
      prisma.userTextActivity.aggregate({
        _count: true,
        where: {
          timestamp: {
            gte: today.pipe(DateTime.startOf("day"), DateTime.toDateUtc),
            lt: today.pipe(DateTime.endOf("day"), DateTime.toDateUtc),
          },
        },
      }),
    );

    yield* Console.log(
      `[Halloween 2025] Daily text activity count: ${todayActivity._count}`,
    );
  }),
  schedule,
  // pipe(Schedule.cron(CRON), Schedule.intersect(Schedule.recurs(10))),
).pipe(Effect.delay(DateTime.distanceDuration(DateTime.unsafeNow(), START_DATE)));

export const halloween2025 = new Hashira({ name: "halloween2025" })
  .use(base)
  .handle("clientReady", async (ctx, client) => {
    program.pipe(
      Effect.provideService(PrismaReader, { getPrisma: Effect.succeed(ctx.prisma) }),
      Effect.provideService(ClientReader, { getClient: Effect.succeed(client) }),
      Effect.runFork,
    );

    Cron.sequence(CRON, START_DATE).take(10);

    Effect.runPromise(
      Stream.fromIterable(Cron.sequence(CRON, START_DATE)).pipe(
        Stream.take(10),
        Stream.runCollect,
      ),
    ).then(console.log);

    Effect.runPromise(
      Stream.runCollect(Stream.fromSchedule(schedule).pipe(Stream.take(10))),
    ).then(console.log);
  });
