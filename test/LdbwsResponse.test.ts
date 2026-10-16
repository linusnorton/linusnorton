import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBoard, rebase } from "../src/departures/LdbwsResponse.js";

const payload = JSON.parse(
  readFileSync(new URL("../src/fixtures/norwich.json", import.meta.url), "utf8")
);

describe("parseBoard", () => {
  const board = parseBoard(payload, true);

  it("reads the station", () => {
    expect(board.station).toBe("Norwich");
    expect(board.crs).toBe("NRW");
  });

  it("reads a destination given as a list", () => {
    expect(board.departures[0]?.destination).toBe("London Liverpool Street");
  });

  it("reads a destination wrapped in a location object", () => {
    expect(board.departures[1]?.destination).toBe("Sheringham");
  });

  it("reads calling points whether or not they are wrapped in a list", () => {
    expect(board.departures[0]?.callingPoints[0]).toBe("Diss");
    expect(board.departures[0]?.callingPoints).toHaveLength(7);
    expect(board.departures[1]?.callingPoints[1]).toBe("Hoveton & Wroxham");
  });

  it("keeps a service with no calling points", () => {
    expect(board.departures[2]?.destination).toBe("Cambridge");
    expect(board.departures[2]?.callingPoints).toEqual([]);
  });

  it("strips the markup out of a message", () => {
    expect(board.messages[0]).toBe(
      "Services between Norwich and Great Yarmouth are subject to alteration due to a shortage of train crew. More details."
    );
  });

  it("defaults a missing expected time to on time", () => {
    expect(parseBoard({ trainServices: [{ std: "09:00" }] }, true).departures[0]?.expected).toBe(
      "On time"
    );
  });

  it("survives a board with no services at all", () => {
    expect(parseBoard({ locationName: "Norwich", trainServices: null }, true).departures).toEqual(
      []
    );
  });
});

describe("rebase", () => {
  it("moves the first departure to just after now", () => {
    const now = new Date("2026-10-16T09:00:00Z");
    const board = rebase(parseBoard(payload, false), now);

    expect(board.departures[0]?.scheduled).toBe("09:04");
    expect(board.departures[1]?.scheduled).toBe("09:10");
    expect(board.generatedAt).toEqual(now);
  });

  it("shifts an expected time but leaves a status alone", () => {
    const board = rebase(parseBoard(payload, false), new Date("2026-10-16T09:00:00Z"));

    expect(board.departures[2]?.expected).toBe("09:23");
    expect(board.departures[5]?.expected).toBe("Cancelled");
  });

  it("wraps around midnight", () => {
    const board = rebase(parseBoard(payload, false), new Date("2026-10-16T23:59:00Z"));

    expect(board.departures[0]?.scheduled).toBe("00:03");
  });
});
