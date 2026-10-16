import { readFile, writeFile } from "node:fs/promises";
import type { BoardContent, BoardRow } from "./board/Board.js";
import { renderBoard } from "./board/Board.js";
import { detailLines } from "./board/DetailLine.js";
import { DARK, LIGHT, type Theme } from "./board/Theme.js";
import type { DepartureBoard } from "./departures/Departure.js";
import { fixtureBoard } from "./departures/FixtureBoard.js";
import { fetchBoard } from "./departures/LdbwsClient.js";
import { boardRegion, replaceRegion } from "./Readme.js";
import { loadConfig } from "./services/Config.js";

const root = new URL("../", import.meta.url);
const fixture = new URL("src/fixtures/norwich.json", root);
const DEPARTURES_SHOWN = 3;

function toRow(departure: DepartureBoard["departures"][number]): BoardRow {
  return {
    platform: departure.platform || "-",
    time: departure.scheduled,
    destination: departure.destination,
    status: departure.expected
  };
}

/**
 * A board that cannot reach Darwin shows the recorded one rather than nothing. Failing the whole
 * render would leave the last good board committed, which is also fine, but only until the api key
 * expires - and a profile that silently stopped updating a month ago is worse than a sample board.
 */
async function readDepartures(crs: string, now: Date): Promise<DepartureBoard> {
  const apiKey = process.env.RDM_API_KEY?.trim();

  if (!apiKey) {
    return fixtureBoard(fixture, now);
  }

  try {
    return await fetchBoard({ crs, apiKey, url: process.env.LDBWS_URL });
  } catch (error) {
    console.warn(`live departures unavailable, falling back to the fixture: ${error}`);

    return fixtureBoard(fixture, now);
  }
}

async function main(): Promise<void> {
  const now = new Date();
  const config = await loadConfig(new URL("config/board.json", root));
  const crs = process.env.STATION_CRS?.trim().toUpperCase() || config.crs;
  const board = await readDepartures(crs, now);
  const departures = board.departures.slice(0, DEPARTURES_SHOWN);
  const content: BoardContent = {
    station: board.station,
    crs: board.crs || crs,
    generatedAt: board.generatedAt,
    departures: departures.map(toRow),
    ...detailLines(board, DEPARTURES_SHOWN),
    services: config.services,
    announcement: board.messages[0] ?? config.announcement,
    footnote: board.live ? "" : "Sample timetable data"
  };
  const themes: Array<[Theme, URL]> = [
    [DARK, new URL("assets/board.svg", root)],
    [LIGHT, new URL("assets/board-light.svg", root)]
  ];

  for (const [theme, path] of themes) {
    await writeFile(path, renderBoard(content, theme), "utf8");
  }

  const readme = new URL("README.md", root);
  const version = Math.floor(now.getTime() / 60_000).toString(36);
  const attribution = board.live
    ? "Live departures from Darwin, via the Rail Data Marketplace"
    : "Sample timetable data";
  const updated = replaceRegion(
    await readFile(readme, "utf8"),
    "board",
    boardRegion(content, version, attribution)
  );

  await writeFile(readme, updated, "utf8");

  console.log(`${content.station} (${content.crs}) · ${departures.length} departures · ${attribution}`);
}

await main();
