/** @jsxImportSource @hashira/jsx */

import { describe, expect, it } from "bun:test";
import type { Easter2026Stage } from "@hashira/db";
import {
  checkMilestoneThreshold,
  formatMilestoneProgress,
  getMilestones,
} from "../../src/events/easter2026/statusService";

const createStage = (
  neededPoints: number,
  completedAt: Date | null = null,
): Easter2026Stage => ({
  id: neededPoints, // simplicity
  teamConfigId: 1,
  neededPoints,
  linkedImageUrl: `https://example.com/stage-${neededPoints}.png`,
  completedAt,
});

describe("StatusService", () => {
  describe("getMilestones", () => {
    it("should return null for both when no stages exist", () => {
      const { current, next } = getMilestones([]);
      expect(current).toBeNull();
      expect(next).toBeNull();
    });

    it("should return next when no stages are completed", () => {
      const stages = [createStage(1000), createStage(2000), createStage(500)];
      const { current, next } = getMilestones(stages);
      expect(current).toBeNull();
      expect(next?.neededPoints).toBe(500);
    });

    it("should return current as most recently completed", () => {
      const stages = [
        createStage(500, new Date("2026-04-05")),
        createStage(1000, new Date("2026-04-10")),
        createStage(2000),
      ];
      const { current, next } = getMilestones(stages);
      expect(current?.neededPoints).toBe(1000);
      expect(next?.neededPoints).toBe(2000);
    });

    it("should return null next when all stages are completed", () => {
      const stages = [
        createStage(500, new Date("2026-04-05")),
        createStage(1000, new Date("2026-04-10")),
      ];
      const { current, next } = getMilestones(stages);
      expect(current?.neededPoints).toBe(1000);
      expect(next).toBeNull();
    });
  });

  describe("formatMilestoneProgress", () => {
    it("should format progress with percentage", () => {
      const result = formatMilestoneProgress(500, null, createStage(1000));
      expect(result).toContain("500/");
      expect(result).toContain("1000");
      expect(result).toContain("50.0%");
    });

    it("should show 100% when at threshold", () => {
      const result = formatMilestoneProgress(1000, null, createStage(1000));
      expect(result).toContain("100.0%");
    });

    it("should show over 100% when past threshold", () => {
      const result = formatMilestoneProgress(1500, null, createStage(1000));
      expect(result).toContain("150.0%");
    });

    it("should handle no milestones", () => {
      const result = formatMilestoneProgress(500, null, null);
      expect(result).toBe("Nie znaleziono progu!");
    });

    it("should use current milestone when next is null", () => {
      const result = formatMilestoneProgress(1500, createStage(1000, new Date()), null);
      expect(result).toContain("1000");
    });
  });

  describe("checkMilestoneThreshold", () => {
    it("should return null when no stages exist", () => {
      const result = checkMilestoneThreshold(500, []);
      expect(result).toBeNull();
    });

    it("should return null when points are below next threshold", () => {
      const stages = [createStage(1000)];
      const result = checkMilestoneThreshold(500, stages);
      expect(result).toBeNull();
    });

    it("should return the stage when points meet threshold", () => {
      const stages = [createStage(1000)];
      const result = checkMilestoneThreshold(1000, stages);
      expect(result?.neededPoints).toBe(1000);
    });

    it("should return the stage when points exceed threshold", () => {
      const stages = [createStage(1000)];
      const result = checkMilestoneThreshold(1500, stages);
      expect(result?.neededPoints).toBe(1000);
    });

    it("should return next uncompleted stage", () => {
      const stages = [
        createStage(500, new Date()),
        createStage(1000),
        createStage(2000),
      ];
      const result = checkMilestoneThreshold(1200, stages);
      expect(result?.neededPoints).toBe(1000);
    });

    it("should return null when all stages are completed", () => {
      const stages = [createStage(500, new Date()), createStage(1000, new Date())];
      const result = checkMilestoneThreshold(1500, stages);
      expect(result).toBeNull();
    });
  });
});
