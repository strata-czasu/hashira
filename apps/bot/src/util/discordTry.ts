import {
  DiscordAPIError,
  DiscordjsError,
  type DiscordjsErrorCodes,
  type RESTJSONErrorCodes,
} from "discord.js";

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
): Promise<T | U> {
  try {
    return await fn();
  } catch (e) {
    if (
      (e instanceof DiscordjsError || e instanceof DiscordAPIError) &&
      codes.some((code) => code === e.code)
    ) {
      const result = await catchFn(e);
      if (!rethrowAfterCatch) return result;
    }
    throw e;
  }
}
