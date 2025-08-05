import type { BunRequest } from "bun";
import env from "env";
import { jwtVerify } from "jose";
import * as v from "valibot";
import { UnauthorizedError } from "./error";

type JWTPayload = {
  userId: string;
  guildId: string;
};

const JWTPayloadSchema = v.object({
  userId: v.string(),
  guildId: v.string(),
});

export async function authenticateRequest(req: BunRequest): Promise<JWTPayload> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix
  const jwtSecret = new TextEncoder().encode(env.WORDLE_JWT_SECRET);

  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    return v.parse(JWTPayloadSchema, payload);
  } catch (e) {
    throw new UnauthorizedError("Invalid or expired token");
  }
}
