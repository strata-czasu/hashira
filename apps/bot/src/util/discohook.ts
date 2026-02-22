import * as v from "valibot";

const DISCOHOOK_API_URL = "https://discohook.app/api/v1" as const;

const QueryDataVersion = v.literal("d2");

const APIEmbed = v.object({
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  color: v.optional(v.number()),
  author: v.optional(
    v.object({
      name: v.string(),
      url: v.optional(v.string()),
      icon_url: v.optional(v.string()),
    }),
  ),
  fields: v.optional(
    v.array(
      v.object({
        name: v.string(),
        value: v.string(),
        inline: v.optional(v.boolean()),
      }),
    ),
  ),
  footer: v.optional(
    v.object({
      text: v.string(),
      icon_url: v.optional(v.string()),
    }),
  ),
  timestamp: v.optional(v.string()),
  image: v.optional(v.object({ url: v.string() })),
  thumbnail: v.optional(v.object({ url: v.string() })),
  provider: v.optional(v.object({ name: v.string(), url: v.optional(v.string()) })),
});

const QueryDataMessageContent = v.object({
  username: v.optional(v.string()),
  avatar_url: v.optional(v.string()),
  author: v.optional(
    v.object({
      name: v.optional(v.string()),
      icon_url: v.optional(v.string()),
      badge: v.optional(v.nullable(v.string())),
    }),
  ),
  content: v.optional(v.string()),
  embeds: v.optional(v.nullable(v.array(APIEmbed))),
  attachments: v.optional(v.array(v.string())),
  webhook_id: v.optional(v.string()),
  components: v.optional(v.array(v.looseObject({}))),
  flags: v.optional(v.number()),
});

const QueryDataMessage = v.object({
  _id: v.optional(v.string()),
  data: QueryDataMessageContent,
  reference: v.optional(v.string()),
});

const QueryDataTarget = v.object({
  type: v.literal(1),
  url: v.string(),
});

const QueryData = v.object({
  version: v.optional(QueryDataVersion),
  backup_id: v.optional(v.string()),
  messages: v.array(QueryDataMessage),
  targets: v.array(QueryDataTarget),
});

const DiscohookGetShareResponse = v.object({
  data: QueryData,
  expires: v.string(),
});

const DiscohookCreateShareResponse = v.object({
  id: v.string(),
  url: v.string(),
  expires: v.string(),
});

export type ShareLinkData = v.InferOutput<typeof QueryData>;
export type DiscohookMessageData = v.InferOutput<typeof QueryDataMessageContent>;

export function parseShareId(input: string): string {
  const url = new URL(input);
  const shareParam = url.searchParams.get("share");
  if (shareParam) return shareParam;
  const pathMatch = input.match(/share[=/]([A-Za-z0-9_-]+)/);

  // biome-ignore lint/style/noNonNullAssertion: we check for the existence of pathMatch before accessing it
  if (pathMatch) return pathMatch[1]!;
  return input.trim();
}

export async function getShareLinkData(id: string) {
  const response = await fetch(`${DISCOHOOK_API_URL}/share/${id}`);
  if (!response.ok) {
    if (response.status === 404) {
      const errorBody = (await response.json()) as {
        message: string;
        expiredAt?: string;
      };
      if (errorBody.expiredAt) {
        throw new Error(`Share link expired at ${errorBody.expiredAt}`);
      }
      throw new Error(errorBody.message ?? "Share link not found");
    }
    throw new Error(`Failed to fetch share link: ${response.statusText}`);
  }
  const json = await response.json();

  return v.safeParse(DiscohookGetShareResponse, json);
}

export async function createShareLink(
  content: unknown,
): Promise<{ id: string; url: string; expires: string }> {
  const queryData: ShareLinkData = {
    version: "d2",
    messages: [
      {
        data: content as DiscohookMessageData,
      },
    ],
    targets: [],
  };
  const response = await fetch(`${DISCOHOOK_API_URL}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: queryData }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create share link: ${response.statusText}`);
  }
  const json = await response.json();
  return v.parse(DiscohookCreateShareResponse, json);
}

export function toMessageCreateOptions(messageData: DiscohookMessageData) {
  const result: {
    content?: string;
    embeds?: typeof messageData.embeds;
    components?: typeof messageData.components;
  } = {};

  if (messageData.content) {
    result.content = messageData.content;
  }
  if (messageData.embeds) {
    result.embeds = messageData.embeds;
  }
  if (messageData.components) {
    result.components = messageData.components;
  }

  return result;
}
