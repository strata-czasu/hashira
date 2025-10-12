import { type BaseMessageOptions, codeBlock, type Message } from "discord.js";

export default async function safeSendCode(
  send: (options: BaseMessageOptions) => Promise<Message<boolean>>,
  code: string,
  language: string,
  options?: Omit<BaseMessageOptions, "content">,
): Promise<void> {
  const codeblock = codeBlock(language, code);

  if (codeblock.length <= 2000) {
    await send({ ...options, content: codeblock });
    return;
  }

  const attachment = Buffer.from(code);
  const filename = `file.${language}`;

  await send({ ...options, files: [{ attachment, name: filename }] });
}
