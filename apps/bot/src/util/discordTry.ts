import { DiscordAPIError, type RESTJSONErrorCodes } from "discord.js";

export const discordTry = async <T, U>(
  fn: () => Promise<T>,
  codes: RESTJSONErrorCodes[],
  catchFn: (e: DiscordAPIError) => Promise<U>,
  rethrowAfterCatch = false,
) => {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof DiscordAPIError && codes.some((code) => code === e.code)) {
      const result = await catchFn(e);
      if (!rethrowAfterCatch) return result;
    }
    throw e;
  }
};
