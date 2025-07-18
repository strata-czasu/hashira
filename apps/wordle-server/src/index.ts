import Env from "@hashira/env";

const client_id = Env.OAUTH_CLIENT_ID;
const client_secret = Env.OAUTH_CLIENT_SECRET;
if (!client_id || !client_secret) {
  throw new Error("OAuth client ID and secret must be set in the environment");
}
console.log("Using OAuth client ID:", client_id);

const server = Bun.serve({
  port: 3001,
  routes: {
    "/api/token": {
      POST: async (req) => {
        const { code } = await req.json();
        if (!code) {
          return Response.json({ error: "Code is required" }, { status: 400 });
        }
        if (typeof code !== "string") {
          return Response.json({ error: "Invalid code format" }, { status: 400 });
        }

        const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id,
            client_secret,
            grant_type: "authorization_code",
            code,
          }),
        });
        if (tokenRes.status !== 200) {
          console.log(tokenRes);
          return Response.json(
            { error: "Failed to exchange code for token" },
            { status: tokenRes.status },
          );
        }

        const { access_token } = await tokenRes.json();
        return Response.json({ access_token });
      },
    },
  },
});

console.log(`Listening on http://${server.hostname}:${server.port}`);
