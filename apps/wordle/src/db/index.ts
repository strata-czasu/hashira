import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export * from "@prisma/client";

// TODO)) Automatically export all types from PrismaJson
export type KnownLetter = PrismaJson.KnownLetter;
