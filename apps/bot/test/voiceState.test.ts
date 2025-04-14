import { describe, expect, test } from "bun:test";
import { range } from "@hashira/utils/range";
import {
  type VoiceStateFlags,
  getIndexOfState,
  getIndicesOfStates,
  voiceStateIndexToFlags,
} from "../src/userActivity/voiceState";

describe("getIndexOfState", () => {
  test("returns 0 for all false flags", () => {
    const flags: VoiceStateFlags = {
      isMuted: false,
      isDeafened: false,
      isStreaming: false,
      isVideo: false,
    };
    expect(getIndexOfState(flags)).toBe(0);
  });

  test("returns 15 for all true flags", () => {
    const flags: VoiceStateFlags = {
      isMuted: true,
      isDeafened: true,
      isStreaming: true,
      isVideo: true,
    };
    expect(getIndexOfState(flags)).toBe(15);
  });

  test("returns correct index for only isMuted true", () => {
    const flags: VoiceStateFlags = {
      isMuted: true,
      isDeafened: false,
      isStreaming: false,
      isVideo: false,
    };
    expect(getIndexOfState(flags)).toBe(1);
  });

  test("returns correct index for only isVideo true", () => {
    const flags: VoiceStateFlags = {
      isMuted: false,
      isDeafened: false,
      isStreaming: false,
      isVideo: true,
    };
    expect(getIndexOfState(flags)).toBe(8);
  });
});

describe("getIndicesOfStates", () => {
  test("returns all indices [0-15] if no flags are provided", () => {
    const indices = getIndicesOfStates({});

    expect(indices).toHaveLength(16);
    expect.arrayContaining([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  test("returns only indices with isMuted true", () => {
    const indices = getIndicesOfStates({ isMuted: true });

    expect(indices).toEqual([1, 3, 5, 7, 9, 11, 13, 15]);
  });

  test("returns indices with isMuted true and isDeafened false", () => {
    const indices = getIndicesOfStates({ isMuted: true, isDeafened: false });

    expect(indices).toEqual([1, 5, 9, 13]);
  });

  test("returns indices with isVideo true and isStreaming false", () => {
    const indices = getIndicesOfStates({ isVideo: true, isStreaming: false });

    expect(indices).toEqual([8, 9, 10, 11]);
  });

  test("returns a single index when all flags are provided", () => {
    const flags: VoiceStateFlags = {
      isMuted: false,
      isDeafened: true,
      isStreaming: false,
      isVideo: true,
    };

    expect(getIndicesOfStates(flags)).toEqual([10]);
  });
});

describe("voiceStateIndexToFlags", () => {
  test("works correctly for all indices", () => {
    for (const i of range(0, 16)) {
      const flags = voiceStateIndexToFlags(i);
      const index = getIndexOfState(flags);
      expect(index).toBe(i);
      expect(flags.isMuted).toBe(Boolean(i & 1));
      expect(flags.isDeafened).toBe(Boolean(i & 2));
      expect(flags.isStreaming).toBe(Boolean(i & 4));
      expect(flags.isVideo).toBe(Boolean(i & 8));
    }
  });
});
