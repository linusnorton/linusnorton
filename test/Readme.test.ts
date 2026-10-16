import { describe, expect, it } from "vitest";
import { boardRegion, replaceRegion } from "../src/Readme.js";
import type { BoardContent } from "../src/board/Board.js";

const content: BoardContent = {
  station: "Norwich",
  crs: "NRW",
  generatedAt: new Date("2026-10-16T14:19:00Z"),
  departures: [
    { platform: "4", time: "14:22", destination: "London Liverpool Street", status: "On time" }
  ],
  callingAt: "Calling at: Diss",
  later: "Later: 14:44 Great Yarmouth",
  services: [],
  announcement: "Please mind the gap",
  footnote: ""
};

describe("replaceRegion", () => {
  it("replaces between the markers and leaves the prose", () => {
    const readme = "before\n<!-- board:start -->\nold\n<!-- board:end -->\nafter";

    expect(replaceRegion(readme, "board", "new")).toBe(
      "before\n<!-- board:start -->\nnew\n<!-- board:end -->\nafter"
    );
  });

  it("refuses a readme with no region rather than appending", () => {
    expect(() => replaceRegion("no markers here", "board", "new")).toThrow(/no board region/);
  });
});

describe("boardRegion", () => {
  const region = boardRegion(content, "abc", "Sample timetable data");

  it("sizes the image to the board it rendered", () => {
    expect(region).toContain('width="912"');
  });

  it("offers both themes and a fallback", () => {
    expect(region).toContain('srcset="assets/board.svg?v=abc"');
    expect(region).toContain('srcset="assets/board-light.svg?v=abc"');
    expect(region).toContain('src="assets/board-light.svg?v=abc"');
  });

  it("says in the alt text what the board says", () => {
    expect(region).toContain("14:22 to London Liverpool Street, on time");
  });

  it("keeps both lines, and the attribution it was given", () => {
    expect(region).toContain("Calling at: Diss");
    expect(region).toContain("Later: 14:44 Great Yarmouth");
    expect(region).toContain("<sub>Sample timetable data, read at 14:19 UTC.</sub>");
  });

  it("repeats the departures as a table", () => {
    expect(region).toContain("| 4 | 14:22 | London Liverpool Street | On time |");
  });
});

