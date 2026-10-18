/**
 * Progressive curriculum words dictionary.
 * Each word can only be selected if ALL of its characters are present
 * in the learner's set of unlocked / learned symbols.
 */
export const CURRICULUM_WORDS_DICTIONARY: string[] = [
  // Unit 1: E, T
  'TE',
  'ET',
  'TEE',

  // Unit 2: + A, I, M, N
  'TEA',
  'EAT',
  'AT',
  'ME',
  'MEN',
  'NET',
  'TIE',
  'ANT',
  'NAME',
  'MINE',
  'TEAM',
  'MAIN',
  'TIME',
  'MINT',
  'AIM',
  'TENT',
  'MAN',
  'NINE',
  'TEN',
  'ITEM',
  'MEET',

  // Unit 3: + S, O, H, K
  'SOS',
  'SEE',
  'HOT',
  'THE',
  'SHE',
  'HOME',
  'SHOE',
  'NOTE',
  'MOON',
  'KITE',
  'TASK',
  'SHOT',
  'SHAKE',
  'SMOKE',
  'TOAST',
  'THAT',
  'THIS',
  'MOM',
  'SON',
  'NOON',
  'EAST',
  'HATE',
  'HEAT',
  'HOPE',

  // Unit 4: + R, D, L, U, C
  'RADIO',
  'CODE',
  'ROGER',
  'CLOUD',
  'DOOR',
  'CARD',
  'SOUND',
  'CLEAR',
  'LEARN',
  'HERO',
  'COLD',
  'DANCE',
  'RACE',
  'TRAIN',
  'LION',
  'DEAR',
  'ROAD',
  'CALL',
  'DARK',
  'HOLD',
  'LUCK',
  'CORE',

  // Unit 5: + W, G, Y, P, B, V, F, Q, J, X, Z
  'MORSE',
  'SIGNAL',
  'WORLD',
  'POWER',
  'BRAVO',
  'FOX',
  'QUICK',
  'ZEBRA',
  'JUMP',
  'WAVE',
  'WIRELESS',
  'KEY',
  'PLAY',
  'BLUE',
  'GREEN',
  'BLACK',
  'FAST',
  'SLOW',
  'VOICE',
  'BUZZ',
];

/**
 * Returns all words composed strictly and exclusively of characters from allowedChars
 */
export function getEligibleWords(allowedChars: string[]): string[] {
  const allowedSet = new Set(allowedChars.map(c => c.toUpperCase()));
  const eligible = CURRICULUM_WORDS_DICTIONARY.filter(word => {
    return word.split('').every(ch => allowedSet.has(ch));
  });

  if (eligible.length > 0) {
    return eligible;
  }

  // Fallback: If no dictionary word fits (e.g. only 1 symbol learned), create a short 2-char token
  if (allowedChars.length >= 2) {
    return [`${allowedChars[0]}${allowedChars[1]}`, `${allowedChars[1]}${allowedChars[0]}`];
  }

  return allowedChars.length > 0 ? [allowedChars[0]] : ['TE'];
}
