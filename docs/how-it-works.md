# How the board works

`README.md` in a repository named after your account renders at the top of your GitHub profile.
GitHub strips scripts and iframes out of it, so nothing on a profile is really live: every
"live" profile card you have seen is an image, and the only question is who draws it and when.

This one is drawn by `npm run render` and committed by a workflow every fifteen minutes.

## The pieces

| File | What it does |
| --- | --- |
| `src/board/DotMatrix.ts` | A 5x7 font, one byte per column, bit 0 the top row - the layout an LED driver wants |
| `src/board/Board.ts` | Lays out the board and emits the SVG |
| `src/board/Theme.ts` | The two colour schemes. Only the card around the board changes |
| `src/board/DetailLine.ts` | Picks what goes on the line under the first departure |
| `src/departures/LdbwsClient.ts` | Live Departure Boards, from the Rail Data Marketplace |
| `src/departures/LdbwsResponse.ts` | Parses the response, and rebases fixture times onto today |
| `src/Readme.ts` | Rewrites the marked regions of `README.md` |
| `config/board.json` | The station, and the lower half of the board |

## Drawing dots instead of setting a font

A board is 48 characters wide and about 800 characters long. Emitting the dots of each one inline
would be roughly 40 times the markup, which matters when the file is rewritten and committed 96
times a day, so each distinct character is defined once as a `<path>` of 2.2 unit squares and
referenced with `<use>`:

```svg
<path id="c78" d="M0 0h2.2v2.2h-2.2z..."/>   <!-- N, once, in <defs> -->
<use href="#c78" x="228" y="90"/>            <!-- every N on the board -->
```

The unlit dots behind the text are not elements at all, they are a 3x3 `<pattern>` tiled over the
panel. Every glyph lands on a multiple of three, so the lit and unlit grids line up for free.

The calling points crawl with a CSS keyframe on a clipped group, not with SMIL - two copies of the
line, translated by the width of one, so the loop is seamless. `prefers-reduced-motion` turns it
and the blinking colon off.

## Light and dark

GitHub honours `<picture>` with `prefers-color-scheme` in markdown. A real departure board is black
in any weather, so both variants keep the panel black and change only the card it sits on; the
reader never sees a board that is the wrong colour for their theme, only a frame.

## Caching, and how fresh the board really is

Measured rather than assumed, because the answer is not the one the profile-readme folklore gives:

1. GitHub rewrites a relative image path in a README to `/<owner>/<repo>/raw/<branch>/<path>`. It
   does this for `srcset` on `<source>` as well as `src` on `<img>`, so `<picture>` works, and it
   keeps the query string.
2. That URL 302s to `raw.githubusercontent.com` **without the query string**.
3. `raw.githubusercontent.com` sends `cache-control: max-age=300` and ignores the query string when
   caching: `?v=anything` returns the same bytes as no query at all.

So the `?v=` stamp the render writes on every pass busts the reader's *browser* cache, which is
real, and does nothing to the CDN, which is not what the folklore says. Absolute
`raw.githubusercontent.com` URLs do not help either - same CDN, same answer. Camo never enters into
it for a repository's own assets.

The practical effect: the board can be up to five minutes behind the last commit, against a
fifteen minute render. Good enough for departures that are ten minutes out, and there is no lever
here that would make it better.

## Live data

Sign up for *Live Departure Boards* on the [Rail Data Marketplace](https://raildata.org.uk), then
add the key as an Actions secret named `RDM_API_KEY`. Without it the render falls back to
`src/fixtures/norwich.json`, a recorded board in the same JSON shape as the live one - the same
parser reads both, and the footer says which it was.

| Variable | Default | Purpose |
| --- | --- | --- |
| `RDM_API_KEY` | none | Rail Data Marketplace key. Unset renders the fixture |
| `STATION_CRS` | `NRW` from `config/board.json` | Three letter station code |
| `LDBWS_URL` | `GetDepartureBoard` on RDM | Another LDBWS gateway or operation |

`GetDepartureBoard` does not send calling points, so the line under the first departure crawls the
departures that did not fit on the board instead. Pointing `LDBWS_URL` at `GetDepBoardWithDetails`
on the same product puts the real calling points there.

## Contributions

The workflow commits as `github-actions[bot]`, so ninety-six commits a day do not land on my
contribution graph. Scheduled workflows are disabled after sixty days of repository inactivity,
which its own commits are enough to prevent.

## Locally

```sh
npm install
npm run render     # writes assets/*.svg and updates README.md
npm test           # biome, tsc, vitest
```
