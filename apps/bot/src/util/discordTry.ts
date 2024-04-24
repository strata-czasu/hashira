import { DiscordAPIError, type RESTJSONErrorCodes } from "discord.js";

interface DiscordTryOptions {
  rethrowAfterCatch?: boolean;
}

export async function discordTry<T, U>(
  fn: () => T,
  codes: RESTJSONErrorCodes[],
  catchFn: (e: DiscordAPIError) => U,
  { rethrowAfterCatch }: DiscordTryOptions = {},
): Promise<T | U> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof DiscordAPIError && codes.some((code) => code === e.code)) {
      const result = await catchFn(e);
      if (!rethrowAfterCatch) return result;
    }
    throw e;
  }
}
