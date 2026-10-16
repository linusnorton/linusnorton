import type { DepartureBoard } from "./Departure.js";
import { parseBoard } from "./LdbwsResponse.js";

/**
 * Live Departure Boards, as published on the Rail Data Marketplace. The url is configurable because
 * the same payload comes out of a handful of gateways - RDM, a self-hosted OpenLDBWS proxy - and
 * the parser does not care which one answered. Swapping GetDepartureBoard for GetDepBoardWithDetails
 * on the same product is what fills the calling points line.
 */
const DEFAULT_URL =
  "https://api1.raildata.org.uk/1010-live-departure-board-dep1_2/LDBWS/api/20220120/GetDepartureBoard";

export interface LdbwsOptions {
  readonly crs: string;
  readonly apiKey: string;
  readonly url?: string;
  readonly rows?: number;
  readonly timeoutMs?: number;
}

export async function fetchBoard(options: LdbwsOptions): Promise<DepartureBoard> {
  const base = options.url ?? DEFAULT_URL;
  const url = new URL(`${base.replace(/\/$/, "")}/${encodeURIComponent(options.crs)}`);

  url.searchParams.set("numRows", String(options.rows ?? 6));

  const response = await fetch(url, {
    headers: { "x-apikey": options.apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(options.timeoutMs ?? 10_000)
  });

  if (!response.ok) {
    throw new Error(`LDBWS ${url.pathname} returned ${response.status} ${response.statusText}`);
  }

  return parseBoard(await response.json(), true);
}
