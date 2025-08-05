export async function exchangeCodeForAccessToken(code: string): Promise<string> {
  const tokenRes = await fetch("/api/auth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  const { access_token } = (await tokenRes.json()) as { access_token: string };
  if (typeof access_token !== "string") {
    throw new Error("Invalid access token received");
  }

  return access_token;
}

export async function getBackendAccessToken(
  accessToken: string,
  guildId: string,
): Promise<string> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ accessToken, guildId }),
  });

  if (!res.ok) {
    throw new Error("Failed to get backend access token");
  }

  const { token } = (await res.json()) as { token: string };
  if (typeof token !== "string") {
    throw new Error("Invalid backend access token received");
  }

  return token;
}
