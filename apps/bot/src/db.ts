import { Hashira } from "@hashira/core";
import { db } from "@hashira/db";
import { MessageQueue } from "@hashira/db/tasks";
import type { Client } from "discord.js";

export const database = new Hashira({ name: "database" })
  .const("db", db)
  .derive(({ db }) => ({
    messageQueue: new MessageQueue(db).addArg<"client", Client>(),
  }));
