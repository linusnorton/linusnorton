import { describe, expect, it } from "vitest";
import { type BoardContent, renderBoard } from "../src/board/Board.js";
import { DARK, LIGHT } from "../src/board/Theme.js";

const content: BoardContent = {
  station: "Norwich",
  crs: "NRW",
  generatedAt: new Date("2026-10-16T14:19:00Z"),
  departures: [
    { platform: "4", time: "14:22", destination: "London Liverpool Street", status: "On time" },
    { platform: "6", time: "14:28", destination: "Sheringham", status: "14:41" },
    { platform: "2", time: "14:58", destination: "Lowestoft", status: "Cancelled" }
  ],
  detail: "Calling at: Diss, Stowmarket, Ipswich",
  services: [
    { platform: "1", time: "07:42", destination: "planarnetwork/raptor", status: "On time" }
  ],
  announcement: "Please mind the gap",
  source: "Darwin via Rail Data Marketplace"
};

describe("renderBoard", () => {
  const svg = renderBoard(content, DARK);

  it("is a single svg element", () => {
    expect(svg.startsWith("<svg xmlns=")).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
  });

  it("describes itself for a reader that cannot see dots", () => {
    expect(svg).toContain("<title id=\"t\">Norwich (NRW) live departures</title>");
    expect(svg).toContain("14:22 to London Liverpool Street, On time");
  });

  it("defines each character it uses exactly once", () => {
    const defined = [...svg.matchAll(/<path id="c(\d+)"/g)].map(match => match[1]);

    expect(defined.length).toBe(new Set(defined).size);
  });

  it("references only characters it has defined", () => {
    const defined = new Set([...svg.matchAll(/<path id="(c\d+)"/g)].map(match => match[1]));

    for (const match of svg.matchAll(/<use href="#(c\d+)"/g)) {
      expect(defined).toContain(match[1]);
    }
  });

  it("draws the dots rather than writing text", () => {
    expect(svg).not.toContain("<text");
    expect(svg).not.toContain("Liverpool Street<");
  });

  it("colours a cancellation differently from an on time service", () => {
    expect(svg).toContain(`<g fill="${DARK.alert}">`);
  });

  it("keeps Darwin's informational statuses out of the red", () => {
    for (const status of ["On time", "Starts here", "Departed", "No report"]) {
      const calm = renderBoard(
        { ...content, departures: [{ ...content.departures[0]!, status }], detail: "" },
        DARK
      );

      expect(calm).not.toContain(`<g fill="${DARK.alert}">`);
    }

    for (const status of ["Cancelled", "Delayed", "14:41"]) {
      const late = renderBoard(
        { ...content, departures: [{ ...content.departures[0]!, status }], detail: "" },
        DARK
      );

      expect(late).toContain(`<g fill="${DARK.alert}">`);
    }
  });

  it("scrolls the calling points and blinks the colon", () => {
    expect(svg).toContain("@keyframes calling");
    expect(svg).toContain("@keyframes blink");
    expect(svg).toContain('<g class="calling">');
  });

  it("offers every animation it starts to a reader who asked for less motion", () => {
    const long = renderBoard(
      {
        ...content,
        announcement:
          "Services between Norwich and Great Yarmouth are subject to alteration due to a shortage of train crew"
      },
      DARK
    );
    const moving = [...long.matchAll(/\.(\w+)\{animation:/g)].map(match => match[1]);
    const stopped = /prefers-reduced-motion: reduce\)\{([^{]+)\{animation:none\}/.exec(long);

    expect(moving).toEqual(expect.arrayContaining(["calling", "notice", "colon"]));
    expect(stopped).not.toBeNull();

    const stilled = new Set(stopped![1]!.split(",").map(name => name.replace(".", "")));

    expect(moving.filter(name => !stilled.has(name))).toEqual([]);
  });

  it("scrolls an announcement too long for the board and prints a short one as it is", () => {
    const short = renderBoard({ ...content, announcement: "Mind the gap" }, DARK);

    expect(short).not.toContain("@keyframes notice");
    expect(short).not.toContain("..");
  });

  it("escapes a destination that would break the markup", () => {
    const mischief = renderBoard(
      {
        ...content,
        station: "Smith & <script>",
        detail: ""
      },
      DARK
    );

    expect(mischief).toContain("Smith &amp; &lt;script&gt;");
    expect(mischief).not.toContain("<script>");
  });

  it("changes only the card between the two themes", () => {
    const light = renderBoard(content, LIGHT);

    expect(light).toContain(LIGHT.surround);
    expect(light.replace(LIGHT.surround, DARK.surround).replace(LIGHT.surroundEdge, DARK.surroundEdge)).toBe(svg);
  });

  it("truncates a destination that will not fit beside its status", () => {
    const long = renderBoard(
      {
        ...content,
        departures: [
          {
            platform: "1",
            time: "14:22",
            destination: "Ashby-de-la-Zouch and Shepshed Parkway International",
            status: "On time"
          }
        ],
        detail: ""
      },
      DARK
    );
    const uses = [...long.matchAll(/<use href="#c\d+" x="(\d+(?:\.\d+)?)"/g)].map(match =>
      Number(match[1])
    );

    expect(Math.max(...uses)).toBeLessThan(900);
  });
});
