import type {
  DiscordAPIError,
  DiscordjsError,
  DiscordjsErrorCodes,
  RESTJSONErrorCodes,
} from "discord.js";

import { isDiscordAPIError, isDiscordjsError } from "./discordErrors";

type ErrorCodes = (DiscordjsErrorCodes | RESTJSONErrorCodes)[];
type DiscordError = DiscordjsError | DiscordAPIError;
interface Options {
  rethrowAfterCatch?: boolean;
}

export async function discordTry<T, U>(
  fn: () => T,
  codes: ErrorCodes,
  catchFn: (e: DiscordError) => U,
  { rethrowAfterCatch }: Options = {},
): Promise<Awaited<T> | Awaited<U>> {
  try {
    return await fn();
  } catch (e) {
    if ((isDiscordjsError(e) || isDiscordAPIError(e)) && codes.some((code) => code === e.code)) {
      const result = await catchFn(e);
      if (!rethrowAfterCatch) return result;
    }
    throw e;
  }
}
