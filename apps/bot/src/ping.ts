import { Hashira } from "@hashira/core";

export const ping = new Hashira({ name: "ping" }).command("ping", (command) =>
  command
    .setDescription("Sprawdź czas odpowiedzi serwerów Discorda")
    .handle(async (_ctx, _, itx) => {
      if (itx.client.ws.ping === -1) {
        await itx.reply("Spróbuj jeszcze raz za kilka sekund.");
        return;
      }
      await itx.reply(`Pong! ${itx.client.ws.ping}ms`);
    }),
);
