import { Prisma } from "@hashira/prisma-client";

// NOTE: Hot reload re-evaluates the Prisma client module, so errors thrown by a client
// created before the reload are not instances of the current class. Fall back to the
// error name, which Prisma sets explicitly.
const isKnownRequestError = (error: unknown): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError ||
  (error instanceof Error && error.name === "PrismaClientKnownRequestError");

export const isUniqueConstraintError = (error: unknown) =>
  isKnownRequestError(error) && error.code === "P2002";
