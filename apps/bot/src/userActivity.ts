import { Hashira } from "@hashira/core";
import { schema } from "@hashira/db";
import {
	ChannelType,
	PermissionsBitField,
	SlashCommandBuilder,
	SnowflakeUtil,
} from "discord.js";
import { base } from "./base";
import { fetchMessages } from "./util/fetchMessages";
import { isOwner } from "./util/isOwner";

// The preload command is used to preload user activity data for certain channels
const userActivityCommand = new SlashCommandBuilder()
	.setName("user-activity")
	.setDescription("User activity related commands")
	.addSubcommand((subcommand) =>
		subcommand
			.setName("preload")
			.setDescription("Preload user activity data")
			.addChannelOption((option) =>
				option
					.setName("channel")
					.setDescription("The channel to preload")
					.setRequired(false)
					.addChannelTypes(ChannelType.GuildText),
			)
			.addStringOption((option) =>
				option.setName("before").setDescription("The id of message to start from"),
			)
			.addIntegerOption((option) =>
				option
					.setName("limit")
					.setDescription("The limit of messages to preload")
					.setRequired(false)
					.setMinValue(0)
					.setMaxValue(100_000),
			),
	)
	.setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild);

// TODO: this could be merged with the emojiCounting plugin
export const userActivity = new Hashira({ name: "user-activity" })
	.use(base)
	.command(userActivityCommand, async ({ db }, interaction) => {
		if (!(await isOwner(interaction))) return;
		if (!interaction.inGuild()) return;

		const channel =
			interaction.options.getChannel("channel", false, [ChannelType.GuildText]) ??
			interaction.channel;

		if (!channel) {
			await interaction.reply({ content: "Channel not found", ephemeral: true });
			return;
		}
		if (!channel.isTextBased()) {
			await interaction.reply({
				content: "Channel must be a text channel",
				ephemeral: true,
			});
			return;
		}

		const before =
			interaction.options.getString("before") ??
			SnowflakeUtil.generate({ timestamp: Date.now() }).toString();

		const limit = interaction.options.getInteger("limit") ?? 1000;

		await interaction.reply({
			content: "Preloading messages...",
			ephemeral: true,
		});

		let i = 0;
		for await (const messages of fetchMessages(channel, limit, before)) {
			const messageData = messages.map((message) => ({
				userId: message.author.id,
				guildId: message.guild.id,
				messageId: message.id,
				channelId: message.channel.id,
				timestamp: message.createdAt,
			}));
			const userData = messageData.map((data) => ({ id: data.userId }));

			i += messageData.length;

			await interaction.followUp({
				ephemeral: true,
				content: `Preloaded ${i}/${limit} messages. It's ${
					(i / limit) * 100
				}% done. Last message: ${messages.last()}`,
			});

			await db.insert(schema.user).values(userData).onConflictDoNothing();
			await db.insert(schema.userTextActivity).values(messageData);
		}
	})
	.handle("guildMessageCreate", async ({ db }, message) => {
		await db
			.insert(schema.guild)
			.values({ id: message.guild.id })
			.onConflictDoNothing();

		await db
			.insert(schema.user)
			.values({ id: message.author.id })
			.onConflictDoNothing();

		await db.insert(schema.userTextActivity).values({
			userId: message.author.id,
			guildId: message.guild.id,
			messageId: message.id,
			channelId: message.channel.id,
			timestamp: message.createdAt,
		});
	});
