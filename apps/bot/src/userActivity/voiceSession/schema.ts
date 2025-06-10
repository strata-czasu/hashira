import { type RangeUnion, range, rangeObject } from "@hashira/utils/range";
import * as v from "valibot";

const BooleanString = v.pipe(
  v.string(),
  v.union([v.literal("true"), v.literal("false")]),
  v.transform((v) => v === "true"),
);

const NumberString = v.pipe(
  v.string(),
  v.decimal(),
  v.transform((v) => Number(v)),
);

const DateString = v.pipe(
  v.string(),
  v.isoTimestamp(),
  v.transform((v) => new Date(v)),
);

const StateString = v.pipe(
  v.union(range(0, 16).map((i) => v.literal(`${i}`))),
  v.transform((v) => Number(v) as RangeUnion<0, 16>),
);

const voiceSessionSchemaV1 = v.object({
  channelId: v.string(),
  joinedAt: DateString,
  lastUpdate: DateString,
  isMuted: BooleanString,
  isDeafened: BooleanString,
  isStreaming: BooleanString,
  isVideo: BooleanString,
  totalDeafenedSeconds: NumberString,
  totalMutedSeconds: NumberString,
  totalStreamingSeconds: NumberString,
  totalVideoSeconds: NumberString,
  version: v.literal("1"),
});

const voiceSessionSchemaV2 = v.object({
  channelId: v.string(),
  joinedAt: DateString,
  lastUpdate: DateString,
  isMuted: BooleanString,
  isDeafened: BooleanString,
  isStreaming: BooleanString,
  isVideo: BooleanString,
  totalDeafenedSeconds: NumberString,
  totalMutedSeconds: NumberString,
  totalStreamingSeconds: NumberString,
  totalActiveStreamingSeconds: NumberString,
  totalVideoSeconds: NumberString,
  totalActiveVideoSeconds: NumberString,
  version: v.literal("2"),
});

const voiceSessionSchemaV3 = v.object({
  channelId: v.string(),
  joinedAt: DateString,
  lastUpdate: DateString,
  state: StateString,
  ...rangeObject(
    0,
    16,
    () => v.optional(NumberString),
    (i) => `total_${i}`,
  ),
  version: v.literal("3"),
});

export const AnyVersionVoiceSessionSchema = v.union([
  voiceSessionSchemaV1,
  voiceSessionSchemaV2,
  voiceSessionSchemaV3,
]);

export type AnyVersionVoiceSessionSchema = v.InferOutput<
  typeof AnyVersionVoiceSessionSchema
>;

export const voiceSessionSchema = voiceSessionSchemaV3;
export type VoiceSession = v.InferOutput<typeof voiceSessionSchema>;

export const VERSION: VoiceSession["version"] = "3";
