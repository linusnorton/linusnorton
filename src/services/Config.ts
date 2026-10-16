import { readFile } from "node:fs/promises";

export interface ProfileService {
  readonly platform: string;
  readonly time: string;
  readonly destination: string;
  readonly status: string;
  readonly url: string;
  readonly note: string;
}

export interface BoardConfig {
  readonly crs: string;
  readonly announcement: string;
  readonly services: readonly ProfileService[];
}

const FIELDS = ["platform", "time", "destination", "status", "url", "note"] as const;

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }

  return value.trim();
}

/**
 * The config is hand-edited to change what the lower half of the board says, so a typo there should
 * fail the render with the field name in the message rather than quietly draw a board with a blank
 * row on it.
 */
export function parseConfig(payload: unknown): BoardConfig {
  const config = (typeof payload === "object" && payload !== null ? payload : {}) as Record<
    string,
    unknown
  >;
  const services = Array.isArray(config.services) ? config.services : [];

  return {
    crs: requireString(config.crs, "crs").toUpperCase(),
    announcement: requireString(config.announcement, "announcement"),
    services: services.map((service, index) => {
      const row = (typeof service === "object" && service !== null ? service : {}) as Record<
        string,
        unknown
      >;
      const parsed = {} as Record<(typeof FIELDS)[number], string>;

      for (const field of FIELDS) {
        parsed[field] = requireString(row[field], `services[${index}].${field}`);
      }

      return parsed as ProfileService;
    })
  };
}

export async function loadConfig(path: URL): Promise<BoardConfig> {
  return parseConfig(JSON.parse(await readFile(path, "utf8")));
}
