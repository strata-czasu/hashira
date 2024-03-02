import { Hashira } from "@hashira/core";
import { db } from "@hashira/db";

export const database = new Hashira({ name: "database" }).const("db", db);
