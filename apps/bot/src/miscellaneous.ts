import { Hashira } from "@hashira/core";
import { schema } from "@hashira/db";
import { addMilliseconds } from "date-fns";
import { AttachmentBuilder, PermissionFlagsBits } from "discord.js";
import { base } from "./base";
import { fetchMembers } from "./util/fetchMembers";
import { isOwner } from "./util/isOwner";
import { parseUserMentions } from "./util/parseUsers";

interface OldMute {
  czas_trwania: number;
  zakonczenie: string;
  moderator: string;
  powod: string;
  data_wyciszenia: string; // iso date,
  uzytkownik: string;
  guild_id: string;
  id: number;
}

const toNewMute = (oldMute: OldMute): typeof schema.mute.$inferInsert => {
  const createdAt = new Date(oldMute.data_wyciszenia);
  const duration = addMilliseconds(createdAt, oldMute.czas_trwania);
  console.log(createdAt, duration);
  return {
    guildId: oldMute.guild_id,
    userId: oldMute.uzytkownik,
    moderatorId: oldMute.moderator,
    reason: oldMute.powod,
    createdAt,
    endsAt: duration,
  };
};

export const miscellaneous = new Hashira({ name: "miscellaneous" })
  .use(base)
  .group("misc", (group) =>
    group
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .setDescription("Miscellaneous commands")
      .addCommand("parse-statbot", (command) =>
        command
          .setDescription("Parse a Statbot output")
          .addAttachment("csv", (option) =>
            option.setDescription("The CSV file to parse"),
          )
          .handle(async (_, { csv }, itx) => {
            if (csv.size > 100_000) return;
            // rank,name,id,count
            // 1,username_1,123456789012345678,100
            const content = await fetch(csv.url).then((res) => res.text());
            const lines = content.split("\n");
            const ids = lines.slice(1).map((line) => {
              const [_, __, id] = line.split(",");
              return `<@${id}>`;
            });

            const attachment = new AttachmentBuilder(Buffer.from(ids.join(" ")), {
              name: "parsed.txt",
            });

            await itx.reply({ files: [attachment] });
          }),
      )
      .addCommand("add-role", (command) =>
        command
          .setDescription("Add a role to a list of users")
          .addAttachment("users", (option) =>
            option.setDescription("The users to add the role to"),
          )
          .addRole("role", (option) =>
            option.setDescription("The role to add to the user"),
          )
          .handle(async (_, { users, role }, itx) => {
            // Don't allow for more than 10 kilobytes of users
            if (users.size > 20_000) return;
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();
            const content = await fetch(users.url).then((res) => res.text());
            const members = await fetchMembers(itx.guild, parseUserMentions(content));

            await itx.editReply("Fetched members, now adding roles.");

            await Promise.all(members.map((member) => member.roles.add(role.id)));

            await itx.editReply("Added role to users");
          }),
      )
      .addCommand("load-mutes", (command) =>
        command
          .setDescription("Load mutes from JSON")
          .addAttachment("mutes", (option) =>
            option.setDescription("The mutes to load"),
          )
          .handle(async ({ db }, { mutes }, itx) => {
            if (!(await isOwner(itx))) return;
            const content = (await fetch(mutes.url).then((res) =>
              res.json(),
            )) as OldMute[];
            const mutesToInsert = content.map(toNewMute);
            const users = [
              ...new Set(
                mutesToInsert.flatMap((mute) => [mute.userId, mute.moderatorId]),
              ),
            ];
            const userChunks = [];
            for (let i = 0; i < users.length; i += 1000) {
              userChunks.push(users.slice(i, i + 1000));
            }
            await Promise.all(
              userChunks.map((chunk) =>
                db
                  .insert(schema.user)
                  .values(chunk.map((id) => ({ id })))
                  .onConflictDoNothing(),
              ),
            );
            const chunks = [];
            for (let i = 0; i < mutesToInsert.length; i += 1000) {
              chunks.push(mutesToInsert.slice(i, i + 1000));
            }
            await Promise.all(
              chunks.map((chunk) =>
                db.insert(schema.mute).values(chunk).onConflictDoNothing(),
              ),
            );
          }),
      ),
  );
