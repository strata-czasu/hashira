import env from "@hashira/env";
import * as v from "valibot";

const ShortUrl = v.object({
  shortCode: v.string(),
  shortUrl: v.string(),
  longUrl: v.string(),
  dateCreated: v.string(),
  visitsSummary: v.object({
    total: v.number(),
    nonBots: v.number(),
    bots: v.number(),
  }),
  tags: v.array(v.string()),
  meta: v.object({
    validSince: v.nullable(v.string()),
    validUntil: v.nullable(v.string()),
    maxVisits: v.nullable(v.number()),
  }),
  domain: v.nullable(v.string()),
  title: v.nullable(v.string()),
  crawlable: v.boolean(),
  forwardQuery: v.boolean(),
  hasRedirectRules: v.boolean(),
});

const ShlinkResponse = v.object({
  shortUrls: v.object({
    data: v.array(ShortUrl),
    pagination: v.object({
      currentPage: v.number(),
      pagesCount: v.number(),
      itemsPerPage: v.number(),
      itemsInCurrentPage: v.number(),
      totalItems: v.number(),
    }),
  }),
});

export function getShortenedUrl(url: string) {
  if (!env.SHLINK_API_KEY || !env.SHLINK_API_URL) {
    throw new Error("Shlink API key or URL not provided");
  }

  return (
    fetch(`${env.SHLINK_API_URL}/rest/v3/short-urls`, {
      method: "POST",
      headers: {
        "X-API-Key": env.SHLINK_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target: url }),
    })
      .then((res) => res.json())
      // biome-ignore lint/style/noNonNullAssertion: this is a valid assertion, as the API will always return a short URL
      .then((res) => v.parse(ShlinkResponse, res).shortUrls.data[0]!)
  );
}
