import { Hashira } from "@hashira/core";
import { sub } from "date-fns";
import { type Message, PermissionFlagsBits } from "discord.js";
import { chunk } from "es-toolkit";

enum PruneDeleteInterval {
  FiveMinutes = 5,
  FifteenMinutes = 15,
  ThirtyMinutes = 30,
  OneHour = 60,
}

const getPruneDeleteSeconds = (deleteInterval: PruneDeleteInterval) => {
  return deleteInterval * 60;
};

export const prune = new Hashira({ name: "prune" }).command("prune", (command) =>
  command
    .setDescription("Usuń wiadomości użytkownika")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addUser("user", (user) => user.setDescription("Użytkownik"))
    .addNumber("delete-interval", (deleteInterval) =>
      deleteInterval
        .setDescription("Przedział czasowy usuwania wiadomości")
        .addChoices(
          { name: "5 minut", value: PruneDeleteInterval.FiveMinutes },
          { name: "15 minut", value: PruneDeleteInterval.FifteenMinutes },
          { name: "30 minut", value: PruneDeleteInterval.ThirtyMinutes },
          { name: "1 godzina", value: PruneDeleteInterval.OneHour },
        ),
    )
    .handle(async (_, { user, "delete-interval": deleteInterval }, itx) => {
      if (!itx.inCachedGuild()) return;
      if (!itx.channel) return;

      const after = sub(itx.createdAt, {
        seconds: getPruneDeleteSeconds(deleteInterval),
      });

      const messages: Message[] = [];
      await itx.deferReply({ ephemeral: true });
      for (let i = 0; i < 10; i++) {
        const lastMessage = messages.at(-1);
        // NOTE: Fetched messages are latest to oldest
        const fetchedMessages = await itx.channel.messages.fetch({
          limit: 100,
          ...(lastMessage ? { before: lastMessage.id } : {}),
        });
        const messagesToDelete = fetchedMessages.filter(
          (message) => message.author.id === user.id && message.createdAt > after,
        );
        messages.push(...messagesToDelete.values());

        // Don't try to fetch more messages if we've reached the `after` cutoff
        const lastFetched = fetchedMessages.at(-1);
        if (!lastFetched || lastFetched.createdAt < after) {
          break;
        }
      }

      if (messages.length === 0) {
        await itx.followUp("Nie znaleziono wiadomości do usunięcia");
        return;
      }

      if (messages.length === 1) {
        await messages[0]?.delete();
        await itx.followUp("Usunięto 1 wiadomość");
        return;
      }

      await itx.followUp(`Usuwam ${messages.length} wiadomości...`);
      await Promise.all(
        chunk(messages, 100).map((chunk) =>
          itx.channel?.bulkDelete(chunk.map((message) => message.id)),
        ),
      );
      await itx.editReply(`Usunięto ${messages.length} wiadomości`);
    }),
);
