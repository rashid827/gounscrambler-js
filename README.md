# gounscrambler-js

Free word unscrambler library — unscramble letters into every valid English word, with Scrabble and Words With Friends scoring. Dependency-free, works in Node.js and the browser.

**Live demo:** open `demo.html` (or the GitHub Pages site after enabling Pages) — type letters, get words instantly.
**Full tool:** [gounscrambler.com](https://gounscrambler.com/) — UK (SOWPODS) and Words With Friends (ENABLE) dictionaries, definitions, pattern search and more, free with no signup.

## Install

```bash
npm install gounscrambler
```

Or copy `solver.js` + `words.json` + `freq.json` + `offensive.json` into your project — no build step, no dependencies.

## Usage (Node)

```js
const { init, unscramble, anagrams, score, isValid } = require("gounscrambler");

await init();

// All words from a rack, most common first (default)
const r = unscramble("listen");
console.log(r.total);            // 140
console.log(r.results[0]);       // { w: "listen", s: 6, l: 6 }

// Exact anagrams only
anagrams("listen").results.map(x => x.w);
// ["listen", "silent", "enlist", "inlets", "slinte", "tinsel"]

// Highest scoring first
unscramble("qwerty", { sort: "score" }).results.slice(0, 3);

// Blank tile: ? counts as a blank (scores 0, like a real blank tile)
unscramble("liste?", { useAll: true }).total;   // 62

// Pattern search: ? = unknown letter
unscramble("", { pattern: "s??a?e" }).total;    // 51

score("quiz");          // 22 (Scrabble)
score("quiz", "wwf");   // 23 (Words With Friends)
isValid("quixotic");    // true
isValid("zzqx");        // false
```

## Usage (browser)

```html
<script src="solver.js"></script>
<script>
  GoUnscrambler.init().then(() => {
    const r = GoUnscrambler.unscramble("listen");
    console.log(r.total); // 140
  });
</script>
```

`init()` fetches `words.json`, `freq.json` and `offensive.json` from the same folder by default — pass `{ baseUrl: "…" }` to load them from elsewhere, or `{ words, freq, offensive }` with data you already have.

## API

### `init(options?) → Promise`

Loads the word data (once). Node reads the JSON files from disk; the browser fetches them. Options: `{ dir }` (Node), `{ baseUrl }` (browser), or `{ words, freq, offensive }` (either).

### `unscramble(letters, options?) → { results, total }`

`letters`: up to 20 letters; `?` inside counts as a blank tile. Options:

| Option | Default | Meaning |
| --- | --- | --- |
| `blanks` | `0` | Extra blank tiles (on top of any `?`) |
| `minLen` / `maxLen` / `exactLen` | `2` / rack size / — | Word length range |
| `startsWith` / `endsWith` / `contains` | — | Letter filters |
| `required` | `[]` | Letters every word must contain |
| `pattern` | — | `?`/`_` = unknown letter, e.g. `s??a?e` (overrides the other filters) |
| `useAll` | `false` | Only words using every letter |
| `includeOffensive` | `false` | Show blocked words (hidden by default) |
| `sort` | `"common"` | `"common"` (most common first) / `"score"` / `"alpha"` |
| `scoreMode` | `"scrabble"` | `"scrabble"` / `"wwf"` |

Each result is `{ w, s, l, b? }` — word (lowercase), score, length, and `b`, the positions covered by blank tiles (those letters score 0).

### `anagrams(letters, options?)`

Same as `unscramble` with `useAll: true` — exact anagrams only.

### `score(word, mode?) → number`

Scrabble values by default; `score(word, "wwf")` for Words With Friends values. Blank tiles are not involved here — see `unscramble` for blank scoring.

### `isValid(word) → boolean`

Is the word in the list?

### `wordCount() → number`

Words in the loaded list (369,479).

## Word list

v1 ships the **US list: 369,479 words** (2–20 letters, broad American English). It is the same list that powers the US mode at gounscrambler.com. The UK list (Collins Scrabble Words, 267,760 words) and the Words With Friends list (ENABLE, 178,692 words) live on the website and are planned for a later release.

Honest limits: the US list is a broad American English list, not the NASPA tournament list word-for-word. See the [Methodology](https://gounscrambler.com/methodology/) page for exactly what each list is.

## Regenerating the data

`words.json`, `freq.json` and `offensive.json` are built from the GoUnscrambler theme dictionaries:

```bash
npm run build-data
# or: node scripts/build-data.js [path/to/theme/assets/js]
```

## GitHub Pages demo

Enable Pages on the repo (Settings → Pages → deploy from the `main` branch, root) and `demo.html` becomes a live mini solver at `https://rashid827.github.io/gounscrambler-js/demo.html`.

## License

MIT — see `LICENSE`. By Rashid Ali ([gounscrambler.com](https://gounscrambler.com/)).
