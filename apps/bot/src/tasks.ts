import { Hashira } from "@hashira/core";
import { base } from "./base";

export const tasks = new Hashira({ name: "tasks" })
  .use(base)
  .handle("ready", async ({ messageQueue }, client) => {
    await messageQueue.consumeLoop({ client });
  });
