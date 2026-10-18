import { MorseSymbol } from '../../types/morse';

/**
 * Sanitizes and normalizes a Morse pattern:
 * converts unicode dashes (–, —, −, _) to standard '-'
 * converts unicode dots (•, ·, etc.) to standard '.'
 * strips inner and outer whitespace.
 */
export function normalizeMorse(pattern: string): string {
  if (!pattern) return '';
  return pattern
    .trim()
    .replace(/[\u2013\u2014\u2212_–—−]/g, '-')
    .replace(/[\u2022\u00B7•·]/g, '.')
    .replace(/\s+/g, '');
}

/**
 * Validates if a string contains exclusively Morse dots (.) and dashes (-)
 */
export function isValidMorsePattern(pattern: string): boolean {
  if (!pattern || pattern.trim().length === 0) return false;
  // Reject if it contains foreign non-morse characters (like letters, punctuation other than dot/dash)
  if (/[^.\-\s\u2013\u2014\u2212_–—−\u2022\u00B7•·]/.test(pattern)) return false;
  const clean = normalizeMorse(pattern);
  return clean.length > 0 && /^[.\-]+$/.test(clean);
}

/**
 * Calculates standard International Morse timing in milliseconds based on Words Per Minute (WPM).
 * Standard PARIS formula: "PARIS" is exactly 50 units.
 * 1 WPM = 50 units per minute = 50 units / 60,000 ms => 1 unit = 1200 / WPM ms.
 */
export function wpmToUnitMs(wpm: number): number {
  const safeWpm = Math.max(5, Math.min(40, wpm));
  return Math.round(1200 / safeWpm);
}

/**
 * Checks for duplicate or conflicting Morse patterns across the symbol set.
 */
export function detectPatternConflict(
  pattern: string,
  symbolChar: string,
  allSymbols: MorseSymbol[],
  currentSymbolId?: string
): {
  hasConflict: boolean;
  conflictingSymbol?: MorseSymbol;
  isCharDuplicate: boolean;
  isPatternDuplicate: boolean;
} {
  const normPattern = normalizeMorse(pattern);
  const normChar = symbolChar.trim().toUpperCase();

  const otherSymbols = allSymbols.filter(s => s.id !== currentSymbolId);

  const charDuplicate = otherSymbols.find(s => s.char.toUpperCase() === normChar);
  const patternDuplicate = otherSymbols.find(s => normalizeMorse(s.morse) === normPattern);

  return {
    hasConflict: Boolean(charDuplicate || patternDuplicate),
    conflictingSymbol: patternDuplicate || charDuplicate,
    isCharDuplicate: Boolean(charDuplicate),
    isPatternDuplicate: Boolean(patternDuplicate),
  };
}

/**
 * Encodes text to Morse representation with standard inter-character spacing (' ')
 * and inter-word spacing (' / ').
 */
export function encodeTextToMorse(text: string, symbols: MorseSymbol[]): string {
  const symbolMap = new Map<string, string>();
  for (const s of symbols) {
    symbolMap.set(s.char.toUpperCase(), s.morse);
  }

  const words = text.trim().toUpperCase().split(/\s+/);
  return words
    .map(word => {
      const chars = word.split('');
      return chars
        .map(c => symbolMap.get(c) || '')
        .filter(Boolean)
        .join(' ');
    })
    .join(' / ');
}

/**
 * Decodes a Morse string back to text.
 * Expects characters separated by space and words separated by '/' or multiple spaces.
 */
export function decodeMorseToText(morseStr: string, symbols: MorseSymbol[]): string {
  const morseMap = new Map<string, string>();
  for (const s of symbols) {
    morseMap.set(normalizeMorse(s.morse), s.char.toUpperCase());
  }

  const words = morseStr.trim().split(/\s*\/\s*|\s{3,}/);
  return words
    .map(word => {
      const tokens = word.trim().split(/\s+/);
      return tokens
        .map(token => morseMap.get(normalizeMorse(token)) || '?')
        .join('');
    })
    .join(' ');
}

/**
 * Robust answer validation.
 * Checks whether user input matches expected value or symbol representation.
 * Handles:
 * - Direct letter/character match (case-insensitive)
 * - Morse pattern match (normalized dots and dashes, ignoring spaces and unicode variants)
 * - Symbol fallback: if a symbol is provided, accepts either its canonical character or its Morse code!
 */
export function checkAnswer(
  expected: string,
  userResponse: string,
  symbol?: MorseSymbol,
  allSymbols?: MorseSymbol[]
): boolean {
  if (!userResponse || !expected) return false;

  const cleanUser = userResponse.trim();
  const cleanExpected = expected.trim();

  // 1. Direct text case-insensitive match (e.g. "E" === "E", "TEA" === "TEA")
  if (cleanUser.toUpperCase() === cleanExpected.toUpperCase()) {
    return true;
  }

  // 2. Normalized Morse pattern match (e.g. ".-" === ".-", "—" === "-", "•" === ".")
  const normUserMorse = normalizeMorse(cleanUser);
  const normExpMorse = normalizeMorse(cleanExpected);

  if (normUserMorse.length > 0 && normExpMorse.length > 0 && normUserMorse === normExpMorse) {
    return true;
  }

  // 3. Token-by-token Morse comparison if separated by spaces (e.g. "- . .-" vs "-  .  .-")
  const userTokens = cleanUser.split(/\s+/).map(normalizeMorse).filter(Boolean);
  const expTokens = cleanExpected.split(/\s+/).map(normalizeMorse).filter(Boolean);
  if (userTokens.length > 0 && userTokens.length === expTokens.length) {
    if (userTokens.every((tok, i) => tok === expTokens[i])) {
      return true;
    }
  }

  // 4. Target symbol fallback: if target symbol is provided, check if user input matches either its character or Morse
  if (symbol) {
    const symbolChar = symbol.char.trim().toUpperCase();
    const symbolMorse = normalizeMorse(symbol.morse);

    if (cleanUser.toUpperCase() === symbolChar) {
      return true;
    }
    if (normUserMorse.length > 0 && normUserMorse === symbolMorse) {
      return true;
    }
  }

  // 5. Decode Morse input to text and compare with expected word
  if (allSymbols && allSymbols.length > 0) {
    // If expected is a text word (like "TEA"), and user typed Morse (like "- . .-")
    if (userTokens.length > 0) {
      const decodedUser = decodeMorseToText(cleanUser, allSymbols).toUpperCase();
      if (decodedUser === cleanExpected.toUpperCase()) {
        return true;
      }
    }
    // If expected is Morse (like "- . .-") and user typed text (like "TEA")
    const encodedExp = encodeTextToMorse(cleanExpected, allSymbols);
    if (encodedExp && normalizeMorse(encodedExp) === normUserMorse) {
      return true;
    }
    const encodedUser = encodeTextToMorse(cleanUser, allSymbols);
    if (encodedUser && normalizeMorse(encodedUser) === normExpMorse) {
      return true;
    }
  }

  return false;
}
