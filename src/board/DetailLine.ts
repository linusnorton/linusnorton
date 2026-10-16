import type { DepartureBoard } from "../departures/Departure.js";

/**
 * The line under the first departure. GetDepBoardWithDetails sends the calling points and they go
 * here, as they would on a real board; GetDepartureBoard does not send them at all, so rather than
 * leave the line blank it carries the departures that did not fit on the board.
 */
export function detailLine(board: DepartureBoard, shown: number): string {
  const first = board.departures[0];

  if (first && first.callingPoints.length > 0) {
    return `Calling at: ${first.callingPoints.join(", ")}`;
  }

  const later = board.departures.slice(shown);

  return later.length > 0
    ? `Later: ${later.map(d => `${d.scheduled} ${d.destination}`).join(", ")}`
    : "";
}
