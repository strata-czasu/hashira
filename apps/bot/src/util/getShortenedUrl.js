"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShortenedUrl = getShortenedUrl;
var env_1 = require("@hashira/env");
var v = require("valibot");
var ShortUrl = v.object({
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
var ShlinkResponse = v.object({
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
function getShortenedUrl(url) {
    if (!env_1.default.SHLINK_API_KEY || !env_1.default.SHLINK_API_URL) {
        throw new Error("Shlink API key or URL not provided");
    }
    return (fetch("".concat(env_1.default.SHLINK_API_URL, "/rest/v3/short-urls"), {
        method: "POST",
        headers: {
            "X-API-Key": env_1.default.SHLINK_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ target: url }),
    })
        .then(function (res) { return res.json(); })
        // biome-ignore lint/style/noNonNullAssertion: this is a valid assertion, as the API will always return a short URL
        .then(function (res) { return v.parse(ShlinkResponse, res).shortUrls.data[0]; }));
}
