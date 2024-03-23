import { Collection, type FetchMessagesOptions, Message } from "discord.js";

export async function* fetchMessages<T extends Message>(
	channel: {
		messages: {
			fetch: (options: FetchMessagesOptions) => Promise<Collection<string, T>>;
		};
	},
	limit: number,
	before?: string,
): AsyncGenerator<Collection<string, T>> {
	let messages = await channel.messages.fetch(
		before ? { limit: 100, before } : { limit: 100 },
	);

	while (messages.size < limit) {
		const lastId = messages.lastKey();
		if (!lastId) break;

		const newMessages = await channel.messages.fetch({ limit: 100, before: lastId });
		yield newMessages;
		messages = messages.concat(newMessages);

		if (newMessages.size < 100) break;
	}

	return messages;
}
