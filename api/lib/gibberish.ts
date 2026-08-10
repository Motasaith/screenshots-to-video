/**
 * Gibberish / troll-input detection.
 *
 * Used to protect the LLM pipeline and database from users entering random
 * keystrokes, keyboard mashing, or other nonsense in tutorial step descriptions
 * (or project titles).  When this returns `true` the caller should reject the
 * input with a friendly explanation rather than waste compute on it.
 *
 * The detector is intentionally conservative: it should catch obvious troll
 * input (keyboard mash, repeated random letters) without flagging legitimate
 * short step descriptions like "Click OK" or "Save the file".
 */

const VOWELS = new Set(["a", "e", "i", "o", "u", "y", "A", "E", "I", "O", "U", "Y"]);

function isVowel(ch: string): boolean {
  return VOWELS.has(ch);
}

/**
 * Returns true if the input is too short to reliably classify as gibberish.
 * Callers should require a minimum length first (we use 8 chars).
 */
function tooShortToJudge(text: string): boolean {
  const stripped = text.replace(/[^a-zA-Z]/g, "");
  return stripped.length < 8;
}

/**
 * Ratio of letters that are vowels. Real English text is ~35-45% vowels.
 * Pure keyboard mash is usually 5-15%.
 */
function vowelRatio(text: string): number {
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length === 0) return 1;
  let vowels = 0;
  for (const ch of letters) {
    if (isVowel(ch)) vowels++;
  }
  return vowels / letters.length;
}

/**
 * Longest run of consecutive consonants. Real text rarely has 5+ in a row.
 */
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

/**
 * Longest run of a single character repeated (e.g. "aaaaa", "hhhhh").
 */
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
 * Unique-letter ratio. Keyboard mash tends to use a small subset of letters
 * but the *pattern* is the giveaway — we look at the variety of bigrams.
 */
function bigramVariety(text: string): number {
  const letters = text.toLowerCase().replace(/[^a-z]/g, "");
  if (letters.length < 4) return 1;
  const seen = new Set<string>();
  for (let i = 0; i < letters.length - 1; i++) {
    seen.add(letters.substring(i, i + 2));
  }
  // Real text has many unique bigrams; mash has very few.
  return seen.size / (letters.length - 1);
}

export interface GibberishResult {
  isGibberish: boolean;
  reason?: string;
}

/**
 * Detect obvious troll / keyboard-mash input.
 *
 * Triggers (any one of these is enough to flag):
 *  - 4+ identical letters in a row ("aaaa", "hhhh")
 *  - 5+ consecutive consonants ("fsfsgsfgg", "khjjkjhjkh")
 *  - vowel ratio below 12% over 8+ letters
 *  - bigram variety below 30% over 12+ letters (very repetitive patterns)
 */
export function detectGibberish(text: string): GibberishResult {
  if (!text || !text.trim()) {
    return { isGibberish: false };
  }
  if (tooShortToJudge(text)) {
    return { isGibberish: false };
  }

  if (longestRepeatedChar(text) >= 4) {
    return {
      isGibberish: true,
      reason: "Looks like repeated characters — please write a real step description.",
    };
  }

  if (longestConsonantRun(text) >= 5) {
    return {
      isGibberish: true,
      reason: "Looks like random letters — please describe what the user should do.",
    };
  }

  if (vowelRatio(text) < 0.12) {
    return {
      isGibberish: true,
      reason: "Too few vowels — please write a real step description in plain English.",
    };
  }

  // Bigram variety check — only on longer inputs.
  const letters = text.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= 12) {
    const variety = bigramVariety(text);
    if (variety < 0.3) {
      return {
        isGibberish: true,
        reason: "Looks like random characters — please write a real step description.",
      };
    }
  }

  return { isGibberish: false };
}
