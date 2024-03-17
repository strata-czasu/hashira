import { Hashira } from "@hashira/core";
import type { db } from "@hashira/db";
import { emojiUsage } from "@hashira/db/schema";
import {
	ChatInputCommandInteraction,
	GuildEmoji,
	GuildEmojiManager,
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
} from "discord.js";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { match } from "ts-pattern";
import { base } from "./base";
import { parseDate } from "./util/dateParsing";

const EMOJI_REGEX = /(?<!\\)<a?:[^:]+:(\d+)>/g;

const parseEmojis = (guildEmojiManager: GuildEmojiManager, content: string) => {
	const matches = content.matchAll(EMOJI_REGEX);
	if (!matches) return [];

	const emojis: GuildEmoji[] = [];
	for (const match of matches) {
		const emojiId = match[1];
		if (!emojiId) continue;
		const emoji = guildEmojiManager.resolve(emojiId);
		if (!emoji) continue;
		emojis.push(emoji);
	}

	return emojis;
};

const beforeAfterDecorator = (subcommandBuilder: SlashCommandSubcommandBuilder) =>
	subcommandBuilder
		.addStringOption((option) =>
			option.setName("after").setDescription("The date to end at"),
		)
		.addStringOption((option) =>
			option.setName("before").setDescription("The date to start from"),
		);

const emojiStatsGroup = new SlashCommandBuilder()
	.setName("emojistats")
	.setDescription("Get emoji usage stats")
	.addSubcommand((subcommand) =>
		beforeAfterDecorator(
			subcommand
				.setName("user")
				.setDescription("Get emoji usage stats for a user")
				.addUserOption((option) =>
					option
						.setName("user")
						.setDescription("The user to get stats for")
						.setRequired(true),
				),
		),
	)
	.addSubcommand((subcommand) =>
		beforeAfterDecorator(
			subcommand
				.setName("emoji")
				.setDescription("Get emoji usage stats for an emoji")
				.addStringOption((option) =>
					option.setName("emoji").setDescription("The emoji to get stats for"),
				),
		),
	)
	.addSubcommand((subcommand) =>
		beforeAfterDecorator(
			subcommand.setName("guild").setDescription("Get emoji usage stats for a guild"),
		),
	);

const handleUser = async (
	interaction: ChatInputCommandInteraction<"cached">,
	database: typeof db,
	before: Date,
	after: Date,
) => {
	const user = interaction.options.getUser("user");
	if (!user) {
		await interaction.reply({
			ephemeral: true,
			content: "You must provide a user",
		});
		return;
	}

	const emojiUsages = await database
		.select({
			emojiId: emojiUsage.emojiId,
			count: count(emojiUsage.emojiId),
		})
		.from(emojiUsage)
		.where(
			and(
				eq(emojiUsage.userId, user.id),
				sql`${emojiUsage.timestamp} BETWEEN ${after} AND ${before}`,
			),
		)
		.groupBy(emojiUsage.emojiId)
		.orderBy(desc(count(emojiUsage.emojiId)))
		.limit(20);

	await interaction.reply({
		content: `User ${user.username} used the following emojis:\n${emojiUsages
			.map((usage) => {
				const emoji = interaction.guild.emojis.resolve(usage.emojiId.toString());
				const emojiRepresentation = emoji?.toString() ?? usage.emojiId;
				return `${emojiRepresentation}: ${usage.count}`;
			})
			.join("\n")}`,
	});
};

const handleEmoji = async (
	interaction: ChatInputCommandInteraction<"cached">,
	database: typeof db,
	before: Date,
	after: Date,
) => {
	const rawEmoji = interaction.options.getString("emoji");
	if (!rawEmoji) {
		await interaction.reply({ ephemeral: true, content: "You must provide an emoji" });
		return;
	}

	const emojis = parseEmojis(interaction.guild.emojis, rawEmoji);

	if (emojis.length !== 1) {
		await interaction.reply({
			ephemeral: true,
			content: "Please provide only one emoji",
		});
		return;
	}

	const [emoji] = emojis;

	if (!emoji) {
		await interaction.reply({ ephemeral: true, content: "Invalid emoji" });
		return;
	}

	const emojiUsages = await database
		.select({
			userId: emojiUsage.userId,
			count: count(emojiUsage.userId),
		})
		.from(emojiUsage)
		.where(
			and(
				eq(emojiUsage.emojiId, emoji.id),
				sql`${emojiUsage.timestamp} BETWEEN ${after} AND ${before}`,
			),
		)
		.groupBy(emojiUsage.userId)
		.orderBy(desc(count(emojiUsage.userId)))
		.limit(20);

	await interaction.reply({
		content: `Emoji ${emoji} was used by the following users:\n${emojiUsages
			.map((usage) => `<@${usage.userId}>: ${usage.count}`)
			.join("\n")}`,
	});
};

const handleGuild = async (
	interaction: ChatInputCommandInteraction<"cached">,
	database: typeof db,
	before: Date,
	after: Date,
) => {
	const emojiUsages = await database
		.select({
			emojiId: emojiUsage.emojiId,
			count: count(emojiUsage.emojiId),
		})
		.from(emojiUsage)
		.where(sql`${emojiUsage.timestamp} BETWEEN ${after} AND ${before}`)
		.groupBy(emojiUsage.emojiId)
		.orderBy(desc(count(emojiUsage.emojiId)))
		.limit(20);

	await interaction.reply({
		content: `The following emojis were used:\n${emojiUsages
			.map((usage) => {
				const emoji = interaction.guild.emojis.resolve(usage.emojiId.toString());
				const emojiRepresentation = emoji?.toString() ?? usage.emojiId;
				return `${emojiRepresentation}: ${usage.count}`;
			})
			.join("\n")}`,
	});
};

export const emojiCounting = new Hashira({ name: "emoji-parsing" })
	.use(base)
	.handle("messageCreate", async ({ db }, message) => {
		if (!message.inGuild()) return;
		if (message.author.bot) return;

		const matches = message.content.matchAll(EMOJI_REGEX);
		if (!matches) return;

		const guildEmojis = parseEmojis(message.guild.emojis, message.content);
		if (guildEmojis.length === 0) return;

		await db.insert(emojiUsage).values(
			guildEmojis.map((emoji) => ({
				userId: message.author.id,
				emojiId: emoji.id,
				guildId: message.guild.id,
			})),
		);
	})
	.command(emojiStatsGroup, async ({ db }, interaction) => {
		if (!interaction.inCachedGuild()) {
			await interaction.reply({
				ephemeral: true,
				content: "This command can only be used in a guild",
			});
			return;
		}

		const subcommand = interaction.options.getSubcommand();

		const after = parseDate(
			interaction.options.getString("after"),
			"start",
			() => new Date(0),
		);

		const before = parseDate(
			interaction.options.getString("before"),
			"end",
			() => new Date(),
		);

		await match(subcommand)
			.with("user", () => handleUser(interaction, db, before, after))
			.with("emoji", () => handleEmoji(interaction, db, before, after))
			.with("guild", () => handleGuild(interaction, db, before, after))
			.run();
	});
