import type { DepartureBoard } from "../departures/Departure.js";

export interface DetailLines {
  /** Where the first departure calls, which is a fact about that service */
  readonly callingAt: string;
  /** The departures that did not fit, which is a fact about the board */
  readonly later: string;
}

/**
 * The two lines that go between the departures. They are separate because they belong to different
 * things and so hang underneath different rows: calling points under the service they describe,
 * the later departures under the last row on the board. GetDepBoardWithDetails sends calling
 * points and GetDepartureBoard does not, so on a plain board only the second line appears.
 */
export function detailLines(board: DepartureBoard, shown: number): DetailLines {
  const first = board.departures[0];
  const later = board.departures.slice(shown);

  return {
    callingAt:
      first && first.callingPoints.length > 0 ? `Calling at: ${first.callingPoints.join(", ")}` : "",
    later:
      later.length > 0 ? `Later: ${later.map(d => `${d.scheduled} ${d.destination}`).join(", ")}` : ""
  };
}
