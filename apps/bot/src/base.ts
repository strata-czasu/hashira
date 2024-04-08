import { Hashira } from "@hashira/core";
import { database } from "./db";

export const base = new Hashira({ name: "base" }).use(database);
