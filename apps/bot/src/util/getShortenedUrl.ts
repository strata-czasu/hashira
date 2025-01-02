import env from "@hashira/env";

export function getShortenedUrl(url: string): Promise<string> {
  if (!env.KUTT_API_KEY || !env.KUTT_URL) {
    throw new Error("Kutt API key or URL not provided");
  }

  return fetch(env.KUTT_URL, {
    method: "POST",
    headers: {
      "X-API-Key": env.KUTT_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ target: url }),
  })
    .then((res) => res.json())
    .then((data) => data.link);
}
