import { GLYPH_COLUMNS, GLYPH_ROWS, litDots, normalise } from "./DotMatrix.js";
import type { Theme } from "./Theme.js";

const DOT_PITCH = 3;
const DOT_SIZE = 2.2;
/** Five lit columns plus the blank one that separates two characters */
const CELL_WIDTH = (GLYPH_COLUMNS + 1) * DOT_PITCH;
const CELL_HEIGHT = GLYPH_ROWS * DOT_PITCH;
const BOARD_COLUMNS = 48;
const PAD = 24;
const BEZEL = 12;
const LINE_PITCH = 30;
export const BOARD_WIDTH = PAD * 2 + BOARD_COLUMNS * CELL_WIDTH;

/** Columns the fixed fields take up, left to right, as a real LDB lays them out */
const PLATFORM_COLUMN = 0;
const TIME_COLUMN = 3;
const DESTINATION_COLUMN = 10;
const SCROLL_GAP_COLUMNS = 6;
/** How fast the calling points crawl past, in characters a second */
const SCROLL_SPEED = 7;

export interface BoardRow {
  readonly platform: string;
  readonly time: string;
  readonly destination: string;
  readonly status: string;
}

export interface BoardContent {
  readonly station: string;
  readonly crs: string;
  readonly generatedAt: Date;
  readonly departures: readonly BoardRow[];
  /** The second line of the first departure, which is the only one a real board has room for */
  readonly detail: string;
  readonly services: readonly BoardRow[];
  readonly announcement: string;
  readonly source: string;
}

/** Trims trailing zeroes so the markup does not carry "123.00000000001" around */
function n(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function columnX(column: number): number {
  return PAD + column * CELL_WIDTH;
}

/** Cuts text to the columns available, the way a board does when a destination is too long */
function truncate(text: string, columns: number): string {
  return text.length <= columns ? text : `${text.slice(0, Math.max(0, columns - 2)).trimEnd()}..`;
}

/**
 * Every distinct character is emitted once as a <path> of 2.2 unit squares and then referenced with
 * <use>. A board carries around 800 characters; inlining the dots for each would be 40 times the
 * markup, and this file is rewritten and committed every quarter of an hour.
 */
class GlyphLibrary {
  private readonly used = new Map<string, string>();

  reference(char: string): string {
    const id = `c${char.codePointAt(0)}`;

    if (!this.used.has(char)) {
      const dots = litDots(char).map(
        ([column, row]) =>
          `M${n(column * DOT_PITCH)} ${n(row * DOT_PITCH)}h${n(DOT_SIZE)}v${n(DOT_SIZE)}h-${n(DOT_SIZE)}z`
      );

      this.used.set(char, dots.join(""));
    }

    return id;
  }

  defs(): string {
    return [...this.used]
      .map(([char, path]) => `<path id="c${char.codePointAt(0)}" d="${path}"/>`)
      .join("\n    ");
  }
}

/** One colour of lit dots. Keeping each colour in its own group means one fill attribute, not 800 */
class Layer {
  private readonly parts: string[] = [];

  constructor(
    private readonly library: GlyphLibrary,
    private readonly fill: string
  ) {}

  write(column: number, y: number, text: string): this {
    const characters = normalise(text);

    for (let index = 0; index < characters.length; index++) {
      const char = characters[index]!;

      if (char !== " ") {
        const id = this.library.reference(char);

        this.parts.push(`<use href="#${id}" x="${n(columnX(column + index))}" y="${n(y)}"/>`);
      }
    }

    return this;
  }

  rightAlign(endColumn: number, y: number, text: string): this {
    return this.write(endColumn - normalise(text).length, y, text);
  }

  get empty(): boolean {
    return this.parts.length === 0;
  }

  /** The bare <use> elements, for a caller that needs to wrap them in a clip or a transform */
  uses(): string {
    return this.parts.join("");
  }

  markup(): string {
    return this.empty ? "" : `<g fill="${this.fill}">${this.uses()}</g>`;
  }
}

/**
 * Late and cancelled services get the red. The rest of Darwin's informational etd values do not:
 * a departed service or one with no report is not a problem, and a bare "14:41" is, because the
 * only reason Darwin sends a time in place of "On time" is that the service is running late.
 */
function isAlert(status: string): boolean {
  return !/^(on time|starts here|departed|no report)$/i.test(status.trim());
}

export function renderBoard(content: BoardContent, theme: Theme): string {
  const library = new GlyphLibrary();
  const accent = new Layer(library, theme.accent);
  const lit = new Layer(library, theme.lit);
  const dim = new Layer(library, theme.dim);
  const alert = new Layer(library, theme.alert);
  const blink = new Layer(library, theme.accent);
  const rules: string[] = [];
  const separators: string[] = [];
  const crawlers: string[] = [];
  /** Class names carrying an animation, so the reduced motion rule can name all of them */
  const animated = ["colon"];

  let y = PAD;

  const line = (): number => {
    const current = y;
    y += LINE_PITCH;
    return current;
  };

  const separate = (): void => {
    separators.push(
      `<rect x="${n(columnX(0))}" y="${n(y - 6)}" width="${n(BOARD_COLUMNS * CELL_WIDTH - DOT_PITCH)}" height="2" fill="${theme.dim}" opacity="0.5"/>`
    );
    y += 9;
  };

  /**
   * A line too long for the board crawls past instead of being cut off, which is what a real one
   * does with a long list of calling points or a disruption message. Two copies of the text, one
   * span apart, moving by exactly one span: the loop has no seam in it.
   */
  const crawl = (id: string, startColumn: number, at: number, text: string, fill: string): void => {
    const characters = normalise(text);
    const span = (characters.length + SCROLL_GAP_COLUMNS) * CELL_WIDTH;
    const start = columnX(startColumn);
    const width = columnX(BOARD_COLUMNS) - start - DOT_PITCH;
    const line = new Layer(library, fill);

    animated.push(id);
    line.write(0, 0, characters);
    separators.push(
      `<clipPath id="${id}"><rect x="${n(start)}" y="${n(at - 1)}" width="${n(width)}" height="${n(CELL_HEIGHT + 2)}"/></clipPath>`
    );
    crawlers.push(
      `<g clip-path="url(#${id})" fill="${fill}"><g class="${id}">` +
        `<g transform="translate(${n(start)} ${n(at)})">${line.uses()}</g>` +
        `<g transform="translate(${n(start + span)} ${n(at)})">${line.uses()}</g>` +
        "</g></g>"
    );
    rules.push(
      `.${id}{animation:${id} ${n((characters.length + SCROLL_GAP_COLUMNS) / SCROLL_SPEED)}s linear infinite}`,
      `@keyframes ${id}{from{transform:translateX(0)}to{transform:translateX(-${n(span)}px)}}`
    );
  };

  const writeRow = (row: BoardRow, at: number, destinationStyle: Layer): void => {
    const status = normalise(row.status);
    const statusLayer = isAlert(row.status) ? alert : lit;
    const available = BOARD_COLUMNS - status.length - 1 - DESTINATION_COLUMN;

    dim.write(PLATFORM_COLUMN, at, row.platform);
    lit.write(TIME_COLUMN, at, row.time);
    destinationStyle.write(DESTINATION_COLUMN, at, truncate(normalise(row.destination), available));
    statusLayer.rightAlign(BOARD_COLUMNS, at, row.status);
  };

  const header = line();
  accent.write(0, header, content.station);
  dim.rightAlign(BOARD_COLUMNS, header, "live departures");
  separate();

  const headings = line();
  dim.write(PLATFORM_COLUMN, headings, "pl");
  dim.write(TIME_COLUMN, headings, "time");
  dim.write(DESTINATION_COLUMN, headings, "destination");
  dim.rightAlign(BOARD_COLUMNS, headings, "expected");

  content.departures.forEach((departure, index) => {
    writeRow(departure, line(), accent);

    if (index === 0 && content.detail.length > 0) {
      crawl("calling", TIME_COLUMN, y - LINE_PITCH + CELL_HEIGHT + 3, content.detail, theme.dim);
      y += CELL_HEIGHT + 6;
    }
  });

  separate();

  const label = line();
  dim.write(PLATFORM_COLUMN, label, "also departing");
  dim.rightAlign(BOARD_COLUMNS, label, "github.com/linusnorton");

  for (const service of content.services) {
    writeRow(service, line(), lit);
  }

  separate();

  const announcement = line();

  if (normalise(content.announcement).length > BOARD_COLUMNS) {
    crawl("notice", PLATFORM_COLUMN, announcement, content.announcement, theme.dim);
  } else {
    dim.write(PLATFORM_COLUMN, announcement, content.announcement);
  }

  const footer = line();
  const clock = content.generatedAt;
  const hours = clock.getUTCHours().toString().padStart(2, "0");
  const minutes = clock.getUTCMinutes().toString().padStart(2, "0");

  dim.write(PLATFORM_COLUMN, footer, content.source);
  accent.rightAlign(BOARD_COLUMNS - 3, footer, hours);
  blink.write(BOARD_COLUMNS - 3, footer, ":");
  accent.write(BOARD_COLUMNS - 2, footer, minutes);
  rules.push(
    ".colon{animation:blink 2s steps(1,end) infinite}",
    "@keyframes blink{0%,50%{opacity:1}50.01%,100%{opacity:0.12}}"
  );

  const height = y - LINE_PITCH + CELL_HEIGHT + PAD;
  const panel = {
    x: BEZEL,
    y: BEZEL,
    width: BOARD_WIDTH - BEZEL * 2,
    height: height - BEZEL * 2
  };
  const title = `${content.station} (${content.crs}) live departures`;
  const described = content.departures
    .map(d => `${d.time} to ${d.destination}, ${d.status}`)
    .join(". ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(BOARD_WIDTH)} ${n(height)}" width="${n(BOARD_WIDTH)}" height="${n(height)}" role="img" aria-labelledby="t d">
  <title id="t">${escapeXml(title)}</title>
  <desc id="d">${escapeXml(described)}</desc>
  <defs>
    <pattern id="unlit" width="${n(DOT_PITCH)}" height="${n(DOT_PITCH)}" patternUnits="userSpaceOnUse">
      <rect width="${n(DOT_SIZE)}" height="${n(DOT_SIZE)}" fill="${theme.unlit}"/>
    </pattern>
    <radialGradient id="vignette" cx="50%" cy="42%" r="78%">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
    ${library.defs()}
  </defs>
  <style>
    ${rules.join("\n    ")}
    @media (prefers-reduced-motion: reduce){${animated.map(name => `.${name}`).join(",")}{animation:none}}
  </style>
  <rect width="${n(BOARD_WIDTH)}" height="${n(height)}" rx="10" fill="${theme.surround}" stroke="${theme.surroundEdge}"/>
  <rect x="${n(panel.x)}" y="${n(panel.y)}" width="${n(panel.width)}" height="${n(panel.height)}" rx="4" fill="${theme.panel}"/>
  <rect x="${n(panel.x)}" y="${n(panel.y)}" width="${n(panel.width)}" height="${n(panel.height)}" fill="url(#unlit)"/>
  ${separators.join("\n  ")}
  ${crawlers.join("\n  ")}
  ${accent.markup()}
  ${lit.markup()}
  ${dim.markup()}
  ${alert.markup()}
  <g class="colon" fill="${theme.accent}">${blink.uses()}</g>
  <rect x="${n(panel.x)}" y="${n(panel.y)}" width="${n(panel.width)}" height="${n(panel.height)}" rx="4" fill="url(#vignette)" pointer-events="none"/>
</svg>
`;
}
