/**
 * gounscrambler-js — free word unscrambler library.
 *
 * Unscramble letters into every valid English word. Dependency-free,
 * works in Node.js and the browser. Data: words.json (369,479 words,
 * broad American English list), freq.json (frequency ranks),
 * offensive.json (blocklist, hidden by default).
 *
 * Live demo + full tool: https://gounscrambler.com/
 * UK (SOWPODS) and Words With Friends (ENABLE) dictionaries live on the
 * website; v1 of this library ships the US list.
 *
 * License: MIT. Author: Rashid Ali (GoUnscrambler).
 */
(function (root, factory) {
  "use strict";
  /* UMD: Node (require), browser global (window.GoUnscrambler), ESM (import). */
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("fs"), require("path"));
  } else if (typeof define === "function" && define.amd) {
    define([], function () { return factory(null, null); });
  } else {
    root.GoUnscrambler = factory(null, null);
  }
}(typeof self !== "undefined" ? self : this, function (fs, path) {
  "use strict";

  /* Scrabble letter values. */
  var SCORES = { a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8,
                 k: 5, l: 1, m: 3, n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1,
                 u: 1, v: 4, w: 4, x: 8, y: 4, z: 10 };
  /* Words With Friends letter values. */
  var SCORES_WWF = { a: 1, b: 4, c: 4, d: 2, e: 1, f: 4, g: 3, h: 3, i: 1, j: 10,
                     k: 5, l: 2, m: 4, n: 2, o: 1, p: 4, q: 10, r: 1, s: 1, t: 1,
                     u: 2, v: 5, w: 4, x: 8, y: 3, z: 10 };

  var WORDS = null;      /* string[] — sorted, lowercase */
  var BY_LEN = null;     /* {len: string[]} — length buckets for fast search */
  var FREQ = null;       /* {word: rank} — lower rank = more common */
  var OFFENSIVE = null;  /* Set<string> */

  function score(word, mode) {
    var T = mode === "wwf" ? SCORES_WWF : SCORES, s = 0, i;
    word = (word || "").toLowerCase();
    for (i = 0; i < word.length; i++) s += T[word[i]] || 0;
    return s;
  }

  function freqRank(w) {
    if (!FREQ) return 1000000000;
    var r = FREQ[w];
    return r === undefined ? 1000000000 : r;
  }

  function cmpAlpha(a, b) { return a.w < b.w ? -1 : (a.w > b.w ? 1 : 0); }
  function cmpScore(a, b) { return (b.s - a.s) || cmpAlpha(a, b); }
  /* Meaningful words first, obscure ones last; score breaks frequency ties. */
  function cmpCommon(a, b) {
    return (freqRank(a.w) - freqRank(b.w)) || (b.s - a.s) || cmpAlpha(a, b);
  }

  function counts(str) {
    var c = new Array(26).fill(0), i, k;
    for (i = 0; i < str.length; i++) {
      k = str.charCodeAt(i) - 97;
      if (k >= 0 && k < 26) c[k]++;
    }
    return c;
  }

  /* Can the word be formed from rack counts + blanks? Deficit counting. */
  function canForm(w, rc, blanks) {
    var seen = Object.create(null), i, k, d, need = 0;
    for (i = 0; i < w.length; i++) {
      k = w.charCodeAt(i) - 97;
      seen[k] = (seen[k] || 0) + 1;
    }
    for (k in seen) {
      d = seen[k] - rc[k];
      if (d > 0) { need += d; if (need > blanks) return false; }
    }
    return true;
  }

  /* Blank-tile analysis (call only after canForm passed). Greedily consumes
   * real tiles left-to-right; leftover positions were covered by blanks
   * (score 0). Returns {pen, idx}: points to subtract + covered positions. */
  function blankInfo(w, rc, T) {
    var avail = rc.slice(), idx = [], pen = 0, i, k;
    for (i = 0; i < w.length; i++) {
      k = w.charCodeAt(i) - 97;
      if (avail[k] > 0) avail[k]--;
      else { idx.push(i); pen += T[w[i]] || 0; }
    }
    return { pen: pen, idx: idx };
  }

  function patternToRegExp(pattern) {
    var re = "^", ch, i;
    for (i = 0; i < pattern.length; i++) {
      ch = pattern[i].toLowerCase();
      if (ch === "?" || ch === "_") re += "[a-z]";
      else if (ch >= "a" && ch <= "z") re += ch;
      else return null;
    }
    return new RegExp(re + "$");
  }

  function ensureData() {
    if (!WORDS) throw new Error("gounscrambler-js: call init() first (loads words.json).");
  }

  /**
   * Load the word data. Node: reads words.json / freq.json / offensive.json
   * from disk (same folder as solver.js, or pass {dir}). Browser: pass
   * {words, freq, offensive} directly, or {baseUrl} to fetch the JSON files.
   * Returns a Promise that resolves when ready.
   */
  function init(options) {
    options = options || {};
    if (WORDS) return Promise.resolve();
    if (options.words) {
      setData(options.words, options.freq || {}, options.offensive || []);
      return Promise.resolve();
    }
    if (fs && path) {
      var dir = options.dir || path.dirname(__filename);
      /* require() resolves relative to this file; __filename works in Node. */
      var read = function (f) {
        return JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      };
      setData(read("words.json"), read("freq.json"), read("offensive.json"));
      return Promise.resolve();
    }
    if (typeof fetch === "function") {
      var base = (options.baseUrl || "./").replace(/\/?$/, "/");
      var get = function (f) {
        return fetch(base + f).then(function (r) { return r.json(); });
      };
      return Promise.all([
        get("words.json"), get("freq.json"), get("offensive.json")
      ]).then(function (d) { setData(d[0], d[1], d[2]); });
    }
    return Promise.reject(new Error("gounscrambler-js: no data loader available."));
  }

  function setData(words, freq, offensive) {
    WORDS = words;
    FREQ = freq || {};
    OFFENSIVE = new Set(offensive || []);
    BY_LEN = {};
    for (var i = 0; i < words.length; i++) {
      var w = words[i], l = w.length;
      (BY_LEN[l] = BY_LEN[l] || []).push(w);
    }
  }

  /**
   * Unscramble letters into words.
   * options: { blanks, minLen, maxLen, exactLen, startsWith, endsWith,
   *   contains, required (array of letters), pattern, useAll,
   *   includeOffensive, sort ("common"|"score"|"alpha"), scoreMode ("scrabble"|"wwf") }
   * `?` inside `letters` counts as a blank tile. Letters are capped at 20.
   * Returns { results: [{w, s, l, b?}], total } — b lists blank-covered positions.
   */
  function unscramble(letters, options) {
    ensureData();
    options = options || {};
    var raw = (letters || "").toLowerCase();
    var blanks = (options.blanks || 0) + (raw.split("?").length - 1);
    letters = raw.replace(/[^a-z]/g, "");
    if (letters.length > 20) letters = letters.slice(0, 20);
    var pattern = (options.pattern || "").toLowerCase().replace(/[^a-z?_]/g, "");
    var re = null, lo, hi;
    if (pattern) {
      re = patternToRegExp(pattern);
      if (!re) return { error: "bad-pattern", results: [], total: 0 };
      lo = hi = pattern.length;
    } else {
      lo = options.exactLen || options.minLen || 2;
      hi = options.exactLen || options.maxLen || (letters.length + blanks) || 20;
      lo = Math.max(2, Math.min(20, lo));
      hi = Math.max(2, Math.min(20, hi));
      if (lo > hi) { var t = lo; lo = hi; hi = t; }
    }

    var rc = counts(letters);
    var required = new Set(options.required || []);
    var sw = (options.startsWith || "").toLowerCase().replace(/[^a-z]/g, "");
    var ew = (options.endsWith || "").toLowerCase().replace(/[^a-z]/g, "");
    var co = (options.contains || "").toLowerCase().replace(/[^a-z]/g, "");
    var useAll = !!options.useAll;
    var includeOff = !!options.includeOffensive;
    var sortMode = options.sort === "alpha" ? "alpha"
      : (options.sort === "score" ? "score" : "common");
    var scoreMode = options.scoreMode === "wwf" ? "wwf" : "scrabble";
    var T = scoreMode === "wwf" ? SCORES_WWF : SCORES;

    var out = [], L, bucket, i, w, ok;
    for (L = lo; L <= hi; L++) {
      bucket = BY_LEN[L];
      if (!bucket) continue;
      for (i = 0; i < bucket.length; i++) {
        w = bucket[i];
        if (useAll && w.length !== letters.length + blanks) continue;
        if (!includeOff && OFFENSIVE.has(w)) continue;
        if (re) {
          if (!re.test(w)) continue;
          out.push({ w: w, s: score(w, scoreMode), l: w.length });
        } else {
          if (!canForm(w, rc, blanks)) continue;
          if (sw && w.indexOf(sw) !== 0) continue;
          if (ew && w.slice(-ew.length) !== ew) continue;
          if (co && w.indexOf(co) === -1) continue;
          if (required.size) {
            ok = true;
            required.forEach(function (rl) { if (w.indexOf(rl) === -1) ok = false; });
            if (!ok) continue;
          }
          var bi = blanks ? blankInfo(w, rc, T) : null;
          var res = { w: w, s: score(w, scoreMode) - (bi ? bi.pen : 0), l: w.length };
          if (bi && bi.idx.length) res.b = bi.idx;
          out.push(res);
        }
      }
    }

    if (sortMode === "alpha") out.sort(cmpAlpha);
    else if (sortMode === "score") out.sort(cmpScore);
    else out.sort(cmpCommon);

    return { results: out, total: out.length };
  }

  /** Exact anagrams only: every letter used, same length. */
  function anagrams(letters, options) {
    options = Object.assign({}, options, { useAll: true });
    return unscramble(letters, options);
  }

  /** Is the word in the list? (US list, v1.) */
  function isValid(word) {
    ensureData();
    word = (word || "").toLowerCase().replace(/[^a-z]/g, "");
    if (!word) return false;
    var bucket = BY_LEN[word.length] || [];
    return bucket.indexOf(word) !== -1;
  }

  return {
    init: init,
    unscramble: unscramble,
    anagrams: anagrams,
    score: score,
    isValid: isValid,
    wordCount: function () { return WORDS ? WORDS.length : 0; }
  };
}));
