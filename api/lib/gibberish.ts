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
function longestConsonantRun(text: string): number {
  let max = 0;
  let current = 0;
  for (const ch of text) {
    if (/[a-zA-Z]/.test(ch) && !isVowel(ch)) {
      current++;
      if (current > max) max = current;
    } else {
      current = 0;
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
