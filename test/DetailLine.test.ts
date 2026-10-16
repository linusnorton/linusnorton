import { describe, expect, it } from "vitest";
import { detailLine } from "../src/board/DetailLine.js";
import type { Departure, DepartureBoard } from "../src/departures/Departure.js";

function departure(scheduled: string, destination: string, callingPoints: string[] = []): Departure {
  return { scheduled, expected: "On time", destination, platform: "1", operator: "GA", callingPoints };
}

function board(departures: Departure[]): DepartureBoard {
  return {
    station: "Norwich",
    crs: "NRW",
    generatedAt: new Date("2026-10-16T14:19:00Z"),
    departures,
    messages: [],
    live: true
  };
}

describe("detailLine", () => {
  it("uses the calling points when the gateway sends them", () => {
    const line = detailLine(
      board([departure("14:22", "London Liverpool Street", ["Diss", "Ipswich"])]),
      3
    );

    expect(line).toBe("Calling at: Diss, Ipswich");
  });

  it("falls back to the departures that did not fit on the board", () => {
    const line = detailLine(
      board([
        departure("14:22", "London Liverpool Street"),
        departure("14:28", "Sheringham"),
        departure("14:36", "Cambridge"),
        departure("14:44", "Great Yarmouth"),
        departure("14:52", "Liverpool Lime Street")
      ]),
      3
    );

    expect(line).toBe("Later: 14:44 Great Yarmouth, 14:52 Liverpool Lime Street");
  });

  it("is empty when there is nothing left to say", () => {
    expect(detailLine(board([departure("14:22", "Sheringham")]), 3)).toBe("");
    expect(detailLine(board([]), 3)).toBe("");
  });
});
