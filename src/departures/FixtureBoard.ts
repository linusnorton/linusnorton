import { readFile } from "node:fs/promises";
import type { DepartureBoard } from "./Departure.js";
import { parseBoard, rebase } from "./LdbwsResponse.js";

/**
 * A recorded Norwich board, in the same shape the live gateway returns so it goes through the same
 * parser. This is what renders when there is no api key, which is the state the repository is in
 * when somebody clones it - the board has to look right before anyone signs up for anything.
 */
export async function fixtureBoard(path: URL, now: Date): Promise<DepartureBoard> {
  const payload = JSON.parse(await readFile(path, "utf8"));

  return rebase(parseBoard(payload, false), now);
}
