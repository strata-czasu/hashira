import type { BaseMessageOptions, Message } from "discord.js";

export default async function safeSendLongMessage(
  send: (options: BaseMessageOptions) => Promise<Message<boolean>>,
  content: string,
  options?: Omit<BaseMessageOptions, "content">,
): Promise<void> {
  if (content.length <= 2000) {
    await send({ ...options, content });
    return;
  }

  const chunks = content.match(/[\s\S]{1,2000}/g);
  if (!chunks) return;

  for (const chunk of chunks) {
    await send({ ...options, content: chunk });
  }
}
