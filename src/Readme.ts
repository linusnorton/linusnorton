import { BOARD_WIDTH, type BoardContent } from "./board/Board.js";

/**
 * The generated part of the profile lives between markers, so the prose around it survives a render.
 */
export function replaceRegion(readme: string, name: string, content: string): string {
  const region = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);

  if (!region.test(readme)) {
    throw new Error(`README.md has no ${name} region - expected <!-- ${name}:start --> ... :end`);
  }

  return readme.replace(region, `$1\n${content}\n$2`);
}

function cell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

/** Alt text that says what the board says, since a screen reader cannot read dots */
function altText(content: BoardContent): string {
  const departures = content.departures
    .map(d => `${d.time} to ${d.destination}, ${d.status.toLowerCase()}`)
    .join("; ");

  return `Dot matrix departure board for ${content.station} (${content.crs}): ${departures}`
    .replace(/"/g, "'")
    .replace(/\s+/g, " ");
}

export function boardRegion(content: BoardContent, version: string): string {
  const rows = content.departures
    .map(d => `| ${cell(d.platform)} | ${cell(d.time)} | ${cell(d.destination)} | ${cell(d.status)} |`)
    .join("\n");

  return `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/board.svg?v=${version}">
  <source media="(prefers-color-scheme: light)" srcset="assets/board-light.svg?v=${version}">
  <img alt="${altText(content)}" src="assets/board-light.svg?v=${version}" width="${BOARD_WIDTH}">
</picture>

<details>
<summary>The board as text</summary>

| Plat | Departs | Destination | Expected |
| --- | --- | --- | --- |
${rows}

${content.detail}

${content.announcement}

<sub>${content.source}, read at ${content.generatedAt.toISOString().slice(11, 16)} UTC.</sub>

</details>`;
}
