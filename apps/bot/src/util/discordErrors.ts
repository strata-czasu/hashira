import { DiscordAPIError, DiscordjsError } from "discord.js";

// NOTE: Hot reload re-evaluates discord.js, so errors thrown by a client created
// before the reload are instances of the previous module's classes. Fall back to
// matching the constructor name, which both classes keep stable.
const hasConstructorName = (error: unknown, name: string) =>
  error instanceof Error && error.constructor.name === name;

export const isDiscordAPIError = (error: unknown): error is DiscordAPIError =>
  error instanceof DiscordAPIError || hasConstructorName(error, "DiscordAPIError");

export const isDiscordjsError = (error: unknown): error is DiscordjsError =>
  error instanceof DiscordjsError || hasConstructorName(error, "DiscordjsError");
