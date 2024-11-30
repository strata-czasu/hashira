import { Hashira, PaginatedView } from "@hashira/core";
import { StaticPaginator } from "@hashira/paginate";
import { bold, channelMention, userMention } from "discord.js";
import { groupBy, mapValues } from "es-toolkit";
import { base } from "../base";
import { parseUserMentions } from "../util/parseUsers";

export const strataMisc = new Hashira({ name: "strata-misc" })
  .use(base)
  .group("strata", (group) =>
    group
      .setDefaultMemberPermissions(0)
      .setDescription("Dodatkowe komendy :3")
      .addCommand("ok-lista", (command) =>
        command
          .setDescription("Zgarnij listę Opiekunów Kanałów")
          .handle(async (_, __, itx) => {
            if (!itx.inCachedGuild()) return;
            const channels = await itx.guild.channels.fetch();
            const mentionedUsers: { userId: string; channelId: string }[] = [];

            for (const channel of channels.values()) {
              console.log(channel?.id);
              if (!channel) continue;
              if (channel.isVoiceBased() || !channel.isTextBased()) continue;
              if (!channel.topic) continue;

              for (const userId of parseUserMentions(channel.topic)) {
                mentionedUsers.push({ userId, channelId: channel.id });
              }
            }

            const usersById = groupBy(mentionedUsers, (user) =>
              userMention(user.userId),
            );

            const users = mapValues(usersById, (user) =>
              user.map((u) => channelMention(u.channelId)),
            );

            const paginator = new StaticPaginator({
              items: Object.entries(users),
              pageSize: 10,
            });

            const paginatedView = new PaginatedView(
              paginator,
              "Opiekunowie Kanałów",
              ([userMention, channels]) =>
                `${bold(userMention)}: ${channels.join(", ")}`,
            );

            await paginatedView.render(itx);
          }),
      ),
  );
