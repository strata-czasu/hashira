const HASTEBIN_URL = "https://bin.debile.co" as const;

export const hastebin = async (content: string): Promise<string> => {
  const url = `${HASTEBIN_URL}/documents`;
  const response = await fetch(url, {
    method: "POST",
    body: content,
  });

  if (!response.ok) {
    throw new Error(`Failed to create hastebin: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data || typeof data !== "object" || !("key" in data)) {
    throw new Error(`Failed to create hastebin: ${JSON.stringify(data)}`);
  }

  const { key } = data;

  if (key === undefined || typeof key !== "string") {
    throw new Error(`Failed to create hastebin: ${JSON.stringify(data)}`);
  }

  return `${HASTEBIN_URL}/${key}`;
};
