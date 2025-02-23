import { DiscordjsError, type DiscordjsErrorCodes } from "discord.js";

export const isDiscordjsError = (
  e: unknown,
  code: DiscordjsErrorCodes,
): e is DiscordjsError => e instanceof DiscordjsError && e.code === code;
