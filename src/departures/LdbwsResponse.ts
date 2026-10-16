import type { Departure, DepartureBoard } from "./Departure.js";

/**
 * Darwin reaches us as JSON now, but the JSON is a rendering of the old SOAP envelope and different
 * gateways render it differently: a list of one is sometimes the object, sometimes the array, and
 * the calling points are sometimes wrapped in a callingPointList and sometimes not. Rather than
 * pick a gateway and hope, every list goes through asArray and every nested list through unwrap.
 */
type Unknown = Record<string, unknown>;

function asArray(value: unknown): Unknown[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is Unknown => typeof item === "object" && item !== null);
  }

  return typeof value === "object" && value !== null ? [value as Unknown] : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Darwin's messages are html, and a dot matrix board has no way to show a link */
function plain(value: unknown): string {
  return text(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .trim();
}

function locationName(value: unknown): string {
  const candidates = asArray(value).flatMap(item => [item, ...asArray(item.location)]);

  for (const candidate of candidates) {
    const name = text(candidate.locationName);

    if (name.length > 0) {
      return name;
    }
  }

  return "";
}

function callingPoints(value: unknown): string[] {
  return asArray(value)
    .flatMap(list => asArray(list.callingPointList ?? list))
    .flatMap(list => asArray(list.callingPoint ?? list))
    .map(point => text(point.locationName))
    .filter(name => name.length > 0);
}

function departure(service: Unknown): Departure {
  return {
    scheduled: text(service.std),
    expected: text(service.etd) || "On time",
    destination: locationName(service.destination),
    platform: text(service.platform),
    operator: text(service.operator),
    callingPoints: callingPoints(service.subsequentCallingPoints)
  };
}

export function parseBoard(payload: unknown, live: boolean): DepartureBoard {
  const board = (typeof payload === "object" && payload !== null ? payload : {}) as Unknown;
  const generatedAt = new Date(text(board.generatedAt));

  return {
    station: text(board.locationName) || "Unknown",
    crs: text(board.crs),
    generatedAt: Number.isNaN(generatedAt.getTime()) ? new Date() : generatedAt,
    departures: asArray(board.trainServices).map(departure).filter(d => d.scheduled.length > 0),
    messages: asArray(board.nrccMessages)
      .map(message => plain(message.value ?? message.xhtmlMessage ?? message))
      .filter(message => message.length > 0),
    live
  };
}

const MINUTES_IN_DAY = 24 * 60;

function toMinutes(time: string): number | undefined {
  const match = /^(\d{2}):(\d{2})$/.exec(time);

  return match ? Number(match[1]) * 60 + Number(match[2]) : undefined;
}

function toTime(minutes: number): string {
  const wrapped = ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;

  return `${Math.floor(wrapped / 60)
    .toString()
    .padStart(2, "0")}:${(wrapped % 60).toString().padStart(2, "0")}`;
}

/**
 * Slide a recorded board along so its first departure is a few minutes from now. Only the fixtures
 * need this, but they need it badly: a board that says 14:22 next to a clock reading 09:03 doesn't
 * read as sample data, it reads as broken.
 */
export function rebase(board: DepartureBoard, now: Date, leadMinutes = 4): DepartureBoard {
  const first = board.departures.map(d => toMinutes(d.scheduled)).find(value => value !== undefined);

  if (first === undefined) {
    return { ...board, generatedAt: now };
  }

  const offset = now.getUTCHours() * 60 + now.getUTCMinutes() + leadMinutes - first;
  const shift = (time: string): string => {
    const minutes = toMinutes(time);

    return minutes === undefined ? time : toTime(minutes + offset);
  };

  return {
    ...board,
    generatedAt: now,
    departures: board.departures.map(d => ({
      ...d,
      scheduled: shift(d.scheduled),
      expected: shift(d.expected)
    }))
  };
}
