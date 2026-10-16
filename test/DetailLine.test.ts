import { describe, expect, it } from "vitest";
import { detailLines } from "../src/board/DetailLine.js";
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

describe("detailLines", () => {
  it("uses the calling points when the gateway sends them", () => {
    const lines = detailLines(
      board([departure("14:22", "London Liverpool Street", ["Diss", "Ipswich"])]),
      3
    );

    expect(lines.callingAt).toBe("Calling at: Diss, Ipswich");
    expect(lines.later).toBe("");
  });

  it("lists the departures that did not fit on the board", () => {
    const lines = detailLines(
      board([
        departure("14:22", "London Liverpool Street"),
        departure("14:28", "Sheringham"),
        departure("14:36", "Cambridge"),
        departure("14:44", "Great Yarmouth"),
        departure("14:52", "Liverpool Lime Street")
      ]),
      3
    );

    expect(lines.later).toBe("Later: 14:44 Great Yarmouth, 14:52 Liverpool Lime Street");
  });

  it("gives both when the gateway sends calling points and the board overflows", () => {
    const lines = detailLines(
      board([
        departure("14:22", "London Liverpool Street", ["Diss", "Ipswich"]),
        departure("14:28", "Sheringham"),
        departure("14:36", "Cambridge"),
        departure("14:44", "Great Yarmouth")
      ]),
      3
    );

    expect(lines.callingAt).toBe("Calling at: Diss, Ipswich");
    expect(lines.later).toBe("Later: 14:44 Great Yarmouth");
  });

  it("is empty when there is nothing left to say", () => {
    expect(detailLines(board([departure("14:22", "Sheringham")]), 3)).toEqual({
      callingAt: "",
      later: ""
    });
    expect(detailLines(board([]), 3)).toEqual({ callingAt: "", later: "" });
  });
});
