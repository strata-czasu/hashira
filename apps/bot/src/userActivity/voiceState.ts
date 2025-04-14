import type { RangeUnion } from "@hashira/utils/range";

export type VoiceStateFlags = {
  isMuted: boolean;
  isDeafened: boolean;
  isStreaming: boolean;
  isVideo: boolean;
};

export const getIndexOfState = ({
  isMuted,
  isDeafened,
  isStreaming,
  isVideo,
}: VoiceStateFlags) =>
  ((isMuted ? 1 : 0) |
    (isDeafened ? 2 : 0) |
    (isStreaming ? 4 : 0) |
    (isVideo ? 8 : 0)) as RangeUnion<0, 16>;

export const getIndicesOfStates = ({
  isMuted,
  isDeafened,
  isStreaming,
  isVideo,
}: Partial<VoiceStateFlags>) => {
  let mask = 0;
  let target = 0;

  if (isMuted !== undefined) {
    mask |= 1;
    target |= isMuted ? 1 : 0;
  }

  if (isDeafened !== undefined) {
    mask |= 2;
    target |= isDeafened ? 2 : 0;
  }

  if (isStreaming !== undefined) {
    mask |= 4;
    target |= isStreaming ? 4 : 0;
  }

  if (isVideo !== undefined) {
    mask |= 8;
    target |= isVideo ? 8 : 0;
  }

  const indices: RangeUnion<0, 16>[] = [];
  for (let i = 0; i < 16; i++) {
    if ((i & mask) === target) {
      indices.push(i as RangeUnion<0, 16>);
    }
  }

  return indices;
};

export const voiceStateIndexToFlags = (index: RangeUnion<0, 16>): VoiceStateFlags => {
  const isMuted = Boolean(index & 1);
  const isDeafened = Boolean(index & 2);
  const isStreaming = Boolean(index & 4);
  const isVideo = Boolean(index & 8);

  return { isMuted, isDeafened, isStreaming, isVideo };
};
