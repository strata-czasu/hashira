const HASTEBIN_URL = "https://bin.debile.co" as const;

export const hastebin = async (content: string): Promise<string> => {
  const url = `${HASTEBIN_URL}/documents`;
  const response = await fetch(url, {
    method: "POST",
    body: content,
  });
  const data = await response.json();

  const { key } = data;
  if (key === undefined || typeof key !== "string") {
    throw new Error(`Failed to create hastebin: ${JSON.stringify(data)}`);
  }

  return `${HASTEBIN_URL}/${key}`;
};
