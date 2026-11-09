#!/usr/bin/env node
/* Example: unscramble letters with gounscrambler-js (Node.js). */
"use strict";

const { init, unscramble, anagrams, score, isValid } = require("./solver");

(async () => {
  await init();

  // 1. All words from a rack, most common first (default).
  const listen = unscramble("listen");
  console.log("listen ->", listen.total, "words");
  console.log("  exact anagrams:", anagrams("listen").results.map(r => r.w).join(", "));
  console.log("  top 10:", listen.results.slice(0, 10).map(r => r.w + " (" + r.s + ")").join(", "));

  // 2. Highest scoring first.
  const best = unscramble("qwerty", { sort: "score" });
  console.log("\nqwerty, highest score:", best.results.slice(0, 5).map(r => r.w + " (" + r.s + ")").join(", "));

  // 3. Blank tile: ? counts as a blank (scores 0, like a real blank).
  const blank = unscramble("liste?", { useAll: true });
  console.log("\nliste? (blank, use all letters) ->", blank.total, "words");
  console.log("  e.g.", blank.results.slice(0, 8).map(r => r.w).join(", "));

  // 4. Pattern search: ? = unknown letter.
  const pat = unscramble("", { pattern: "s??a?e" });
  console.log("\ns??a?e ->", pat.total, "words");
  console.log("  e.g.", pat.results.slice(0, 8).map(r => r.w).join(", "));

  // 5. Scoring + validity.
  console.log("\nscore('quiz') =", score("quiz"), "| score('quiz', 'wwf') =", score("quiz", "wwf"));
  console.log("isValid('quixotic') =", isValid("quixotic"), "| isValid('zzqx') =", isValid("zzqx"));
})();
