export interface Departure {
  /** Scheduled departure, as the board shows it: "14:22" */
  readonly scheduled: string;
  /** "On time", "14:41", "Cancelled", "Delayed" - whatever Darwin says, shown verbatim */
  readonly expected: string;
  readonly destination: string;
  readonly platform: string;
  readonly operator: string;
  readonly callingPoints: readonly string[];
}

export interface DepartureBoard {
  readonly station: string;
  readonly crs: string;
  readonly generatedAt: Date;
  readonly departures: readonly Departure[];
  /** National Rail Communication Centre messages - disruption, short formations, and so on */
  readonly messages: readonly string[];
  readonly live: boolean;
}
