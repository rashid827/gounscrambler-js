#!/usr/bin/env node
/**
 * build-data.js — regenerate words.json / freq.json / offensive.json
 * from the GoUnscrambler theme dictionary files.
 *
 * Usage: node scripts/build-data.js [theme-js-dir]
 * Default theme dir: ../../theme/gounscrambler/assets/js (relative to repo root).
 * Output: words.json, freq.json, offensive.json in the repo root.
 *
 * The theme files are browser globals (window.GU_WORDS etc.); this script
 * evaluates them in a sandbox with a fake `window` object. It never edits
 * the theme files — read-only.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const themeDir =
  process.argv[2] ||
  path.join(
    __dirname,
    "..",
    "..",
    "..",
    "theme",
    "gounscrambler",
    "assets",
    "js"
  );

function loadGlobal(file, name) {
  const code = fs.readFileSync(path.join(themeDir, file), "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  if (sandbox.window[name] === undefined) {
    throw new Error(file + " did not define window." + name);
  }
  return sandbox.window[name];
}

// --- US word list: buckets {len: "w1\nw2..."} -> flat sorted array ---
const buckets = loadGlobal("words.js", "GU_WORDS");
const words = [];
for (const len of Object.keys(buckets).sort((a, b) => a - b)) {
  for (const w of buckets[len].split("\n")) {
    if (w) words.push(w);
  }
}
words.sort();

// --- frequency ranks: list -> {word: rank} ---
const freqList = loadGlobal("freq.js", "GU_FREQ_LIST");
const freq = {};
freqList.forEach((w, i) => {
  freq[w] = i;
});

// --- offensive blocklist: Set -> array ---
const offensive = loadGlobal("offensive.js", "GU_OFFENSIVE");
const offensiveArr = Array.from(offensive).sort();

fs.writeFileSync(
  path.join(__dirname, "..", "words.json"),
  JSON.stringify(words)
);
fs.writeFileSync(
  path.join(__dirname, "..", "freq.json"),
  JSON.stringify(freq)
);
fs.writeFileSync(
  path.join(__dirname, "..", "offensive.json"),
  JSON.stringify(offensiveArr)
);

console.log("words.json:      " + words.length + " words");
console.log("freq.json:       " + freqList.length + " ranked words");
console.log("offensive.json: " + offensiveArr.length + " blocked words");
