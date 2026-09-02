import { describe, expect, it } from "vitest";
import { getScheduleOverview } from "./scheduleOverview";

describe("Schedule overview contract (#1002)", function() {
  it("calculates W-L-T and selects the earliest playable upcoming game", function() {
    const result = getScheduleOverview([
      { id:"later", date:"2026-09-20", opponent:"Later" },
      { id:"win", date:"2026-08-01", result:"W", scoreReported:true },
      { id:"loss", date:"2026-08-02", result:"L", scoreReported:true },
      { id:"tie", date:"2026-08-03", result:"T", scoreReported:true },
      { id:"cancelled", date:"2026-09-10", result:"X" },
      { id:"reported", date:"2026-09-11", scoreReported:true },
      { id:"next", date:"2026-09-12", opponent:"Next" },
    ], new Date("2026-09-01T09:00:00"));

    expect(result).toMatchObject({ wins:1, losses:1, ties:1 });
    expect(result.nextGame.id).toBe("next");
  });

  it("handles missing schedules and returns no next game", function() {
    expect(getScheduleOverview(null, new Date("2026-09-01T09:00:00"))).toEqual({
      wins:0, losses:0, ties:0, nextGame:null,
    });
  });
});
