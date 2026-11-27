import { Layer, ManagedRuntime } from "effect";

import { Hashira } from "@hashira/core";

import { database } from "../db";
import * as LegacyLevel from "./legacyLevel";
import * as TierSync from "./tierSync";

/** Shared runtime only; handlers live in the legacyLevel module so they register once */
export const legacyLevelBase = new Hashira({ name: "legacyLevelBase" })
  .use(database)
  .const((ctx) => ({
    ...ctx,
    legacyLevel: ManagedRuntime.make(
      TierSync.layer.pipe(Layer.provideMerge(LegacyLevel.layer(ctx.prisma))),
    ),
  }));
