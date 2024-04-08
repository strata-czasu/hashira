import { Hashira } from "@hashira/core";
import { AttachmentBuilder } from "discord.js";
import { base } from "./base";
import { fetchMembers } from "./util/fetchMembers";

const mentionRegex = /^<@!?(\d{15,20})>$/;
const idRegex = /^\d{15,20}$/;

const getFromIdOrMention = (idOrMention: string) => {
	const match = idOrMention.match(mentionRegex);
	if (match) return match[1] ?? null;
	return idRegex.test(idOrMention) ? idOrMention : null;
};

export const miscellaneous = new Hashira({ name: "miscellaneous" })
	.use(base)
	.group("misc", (group) =>
		group
			.setDefaultMemberPermissions(0)
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
						const ids = content
							.split(/\s+/)
							.map(getFromIdOrMention)
							.filter((id): id is string => !!id);

						const members = await fetchMembers(itx.guild, ids);

						await itx.editReply("Fetched members, now adding roles.");

						await Promise.all(members.map((member) => member.roles.add(role.id)));

						await itx.editReply("Added role to users");
					}),
			),
	);
