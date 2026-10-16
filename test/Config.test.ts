import { describe, expect, it } from "vitest";
import { loadConfig, parseConfig } from "../src/services/Config.js";

describe("parseConfig", () => {
  it("names the field that is wrong", () => {
    expect(() =>
      parseConfig({
        crs: "NRW",
        announcement: "hello",
        services: [{ platform: "1", time: "07:42" }]
      })
    ).toThrow("services[0].destination must be a non-empty string");
  });

  it("requires a station", () => {
    expect(() => parseConfig({ announcement: "hello" })).toThrow(/crs/);
  });

  it("upper cases the station code", () => {
    expect(parseConfig({ crs: "nrw", announcement: "hello" }).crs).toBe("NRW");
  });
});

describe("loadConfig", () => {
  it("reads the board that ships with the repository", async () => {
    const config = await loadConfig(new URL("../config/board.json", import.meta.url));

    expect(config.crs).toBe("NRW");
    expect(config.services.length).toBeGreaterThan(0);
  });
});
