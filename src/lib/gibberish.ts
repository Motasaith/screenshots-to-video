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
  if (letters.length >= 12 && bigramVariety(text) < 0.3) {
    return {
      isGibberish: true,
      reason: "Looks like random characters — please write a real step description.",
    };
  }
  return { isGibberish: false };
}
