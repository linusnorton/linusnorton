import { describe, expect, it } from "vitest";
import { GLYPH_COLUMNS, GLYPH_ROWS, litDots, normalise } from "../src/board/DotMatrix.js";

describe("normalise", () => {
  it("folds to the uppercase the board can show", () => {
    expect(normalise("London Liverpool Street")).toBe("LONDON LIVERPOOL STREET");
  });

  it("flattens accents rather than losing the character", () => {
    expect(normalise("Bekesbourne")).toBe("BEKESBOURNE");
    expect(normalise("Pontypridd – Treherbert")).toBe("PONTYPRIDD - TREHERBERT");
  });

  it("replaces what it cannot draw", () => {
    expect(normalise("12½")).toBe("12?");
  });

  it("keeps the characters repository names are made of", () => {
    expect(normalise("planarnetwork/raptor")).toBe("PLANARNETWORK/RAPTOR");
  });
});

describe("litDots", () => {
  it("lights the middle row for a hyphen", () => {
    expect(litDots("-")).toEqual([
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
      [4, 3]
    ]);
  });

  it("lights nothing for a space", () => {
    expect(litDots(" ")).toEqual([]);
  });

  it("stays inside the cell", () => {
    for (const char of normalise("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")) {
      for (const [column, row] of litDots(char)) {
        expect(column).toBeLessThan(GLYPH_COLUMNS);
        expect(row).toBeLessThan(GLYPH_ROWS);
      }
    }
  });
});
