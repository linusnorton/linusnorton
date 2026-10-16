export interface Theme {
  /** Used in the generated filename, so it has to be url safe */
  readonly name: string;
  /** The card the board sits on - the only thing that changes between the two themes */
  readonly surround: string;
  readonly surroundEdge: string;
  readonly panel: string;
  readonly unlit: string;
  readonly lit: string;
  readonly dim: string;
  readonly accent: string;
  readonly alert: string;
}

/**
 * A real board is black whatever the weather, so both themes keep the panel black and change only
 * the card around it. That also sidesteps the awkward half second where GitHub has loaded the
 * light image into a dark page: the board looks the same either way, and only the frame is wrong.
 */
const PANEL = {
  panel: "#07070a",
  unlit: "#2a1d05",
  lit: "#ffb000",
  dim: "#99640a",
  accent: "#ffe3b0",
  alert: "#ff6a4d"
} as const;

export const DARK: Theme = {
  name: "dark",
  surround: "#0d1117",
  surroundEdge: "#30363d",
  ...PANEL
};

export const LIGHT: Theme = {
  name: "light",
  surround: "#f6f8fa",
  surroundEdge: "#d0d7de",
  ...PANEL
};
