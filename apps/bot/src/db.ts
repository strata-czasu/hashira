import { Hashira } from "@hashira/core";
import { prisma } from "@hashira/db";

export const database = new Hashira({ name: "database" }).const("prisma", prisma);
