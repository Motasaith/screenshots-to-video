/**
 * Client-side gibberish / troll-input detection.
 *
 * Mirrors the server-side rules in `api/lib/gibberish.ts` so the user gets
 * immediate inline feedback in the wizard before the API call is even made.
 */

const VOWELS = new Set(["a", "e", "i", "o", "u", "y", "A", "E", "I", "O", "U", "Y"]);

function isVowel(ch: string): boolean {
  return VOWELS.has(ch);
}

function longestRepeatedChar(text: string): number {
  let max = 1;
  let current = 1;
  for (let i = 1; i < text.length; i++) {
    if (text[i] === text[i - 1] && /[a-zA-Z]/.test(text[i])) {
      current++;
      if (current > max) max = current;
    } else {
      current = 1;
    }
  }
  return max;
}

/**
 * Consonant clusters that English spells with more than one letter but
 * pronounces as a single sound. Counting their letters individually is what
 * made this rule reject ordinary words.
 *
 * Longest first, so "tch" is consumed before "ch".
 */
const CONSONANT_CLUSTERS = [
  "sch", "tch", "thr", "shr", "chr", "phr", "ght", "ngh", "str", "spl", "spr", "scr",
  "th", "ch", "sh", "ph", "gh", "wh", "ck", "ng", "qu", "kn", "wr", "rh", "gn", "ps",
  "bb", "cc", "dd", "ff", "gg", "ll", "mm", "nn", "pp", "rr", "ss", "tt", "zz",
];

/**
 * Longest run of consonant *sounds* in any single word.
 *
 * Counting raw letters flagged real words: "walkthrough" spells `lkthr`, five
 * consonant letters in a row, so at a threshold of five every description
 * containing the word was rejected as random letters. Since this product is
 * about walkthroughs, that was close to a guaranteed false positive, and
 * raising the description minimum made it far more likely to be hit.
 *
 * Multi-letter clusters now count as one unit, so "walkthrough" scores 4
 * (l, k, th, r) and passes, while keyboard mash like "asdkjh" still scores 5
 * and does not.
 */
function longestConsonantRun(text: string): number {
  let max = 0;

  // Per word: a space already broke the run before, and splitting makes the
  // cluster lookahead safe at word boundaries.
  for (const rawWord of text.toLowerCase().split(/[^a-z]+/)) {
    if (!rawWord) continue;
    let current = 0;
    let i = 0;
    while (i < rawWord.length) {
      if (isVowel(rawWord[i])) {
        current = 0;
        i++;
        continue;
      }
      const cluster = CONSONANT_CLUSTERS.find((c) => rawWord.startsWith(c, i));
      i += cluster ? cluster.length : 1;
      current++;
      if (current > max) max = current;
    }
  }

  return max;
}

function vowelRatio(text: string): number {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length === 0) return 1;
  let vowels = 0;
  for (const ch of letters) {
    if (isVowel(ch)) vowels++;
  }
  return vowels / letters.length;
}

function bigramVariety(text: string): number {
  const letters = text.toLowerCase().replace(/[^a-z]/g, "");
  if (letters.length < 4) return 1;
  const seen = new Set<string>();
  for (let i = 0; i < letters.length - 1; i++) {
    seen.add(letters.substring(i, i + 2));
  }
  return seen.size / (letters.length - 1);
}

export interface GibberishCheck {
  isGibberish: boolean;
  reason?: string;
}

export function detectGibberish(text: string): GibberishCheck {
  if (!text || !text.trim()) return { isGibberish: false };

  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 8) return { isGibberish: false };

  if (longestRepeatedChar(text) >= 4) {
    return {
      isGibberish: true,
      reason: "Looks like repeated characters. Please write a real step description.",
    };
  }
  if (longestConsonantRun(text) >= 5) {
    return {
      isGibberish: true,
      reason: "Looks like random letters. Please describe what the user should do.",
    };
  }
  if (vowelRatio(text) < 0.12) {
    return {
      isGibberish: true,
      reason: "Too few vowels. Please write a real step description in plain English.",
    };
  }
  if (letters.length >= 12 && bigramVariety(text) < 0.3) {
    return {
      isGibberish: true,
      reason: "Looks like random characters. Please write a real step description.",
    };
  }
  return { isGibberish: false };
}
