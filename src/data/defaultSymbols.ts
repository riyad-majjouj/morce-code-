import { MorseSymbol, SymbolStats } from '../types/morse';

export const createInitialStats = (): SymbolStats => ({
  attempts: 0,
  correct: 0,
  incorrect: 0,
  history: [],
  consecutiveCorrect: 0,
  avgResponseTimeMs: 0,
  lastPracticed: null,
  masteryScore: 0,
  state: 'new',
  confusionCount: {},
  testedExerciseTypes: [],
});

export const DEFAULT_SYMBOLS: MorseSymbol[] = [
  // Letters
  { id: 'letter_e', char: 'E', morse: '.', category: 'letter', mnemonic: 'dit', description: 'Single dot - most frequent English letter', isBuiltIn: true, unitIntroduced: 1, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_t', char: 'T', morse: '-', category: 'letter', mnemonic: 'dah', description: 'Single dash - 2nd most frequent English letter', isBuiltIn: true, unitIntroduced: 1, enabledForPractice: true, stats: createInitialStats() },
  
  { id: 'letter_a', char: 'A', morse: '.-', category: 'letter', mnemonic: 'dit-dah', description: 'Dot followed by dash', isBuiltIn: true, unitIntroduced: 2, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_i', char: 'I', morse: '..', category: 'letter', mnemonic: 'dit-dit', description: 'Two dots', isBuiltIn: true, unitIntroduced: 2, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_m', char: 'M', morse: '--', category: 'letter', mnemonic: 'dah-dah', description: 'Two dashes', isBuiltIn: true, unitIntroduced: 2, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_n', char: 'N', morse: '-.', category: 'letter', mnemonic: 'dah-dit', description: 'Dash followed by dot (opposite of A)', isBuiltIn: true, unitIntroduced: 2, enabledForPractice: true, stats: createInitialStats() },

  { id: 'letter_s', char: 'S', morse: '...', category: 'letter', mnemonic: 'dit-dit-dit', description: 'Three rapid dots', isBuiltIn: true, unitIntroduced: 3, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_o', char: 'O', morse: '---', category: 'letter', mnemonic: 'dah-dah-dah', description: 'Three steady dashes', isBuiltIn: true, unitIntroduced: 3, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_h', char: 'H', morse: '....', category: 'letter', mnemonic: 'dit-dit-dit-dit', description: 'Four quick dots', isBuiltIn: true, unitIntroduced: 3, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_k', char: 'K', morse: '-.-', category: 'letter', mnemonic: 'dah-dit-dah', description: 'Dash dot dash (often used for "over")', isBuiltIn: true, unitIntroduced: 3, enabledForPractice: true, stats: createInitialStats() },

  { id: 'letter_r', char: 'R', morse: '.-.', category: 'letter', mnemonic: 'dit-dah-dit', description: 'Dot dash dot (used for "Roger/Received")', isBuiltIn: true, unitIntroduced: 4, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_d', char: 'D', morse: '-..', category: 'letter', mnemonic: 'dah-dit-dit', description: 'Dash dot dot', isBuiltIn: true, unitIntroduced: 4, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_l', char: 'L', morse: '.-..', category: 'letter', mnemonic: 'dit-dah-dit-dit', description: 'Dot dash dot dot', isBuiltIn: true, unitIntroduced: 4, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_u', char: 'U', morse: '..-', category: 'letter', mnemonic: 'dit-dit-dah', description: 'Two dots then a dash', isBuiltIn: true, unitIntroduced: 4, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_c', char: 'C', morse: '-.-.', category: 'letter', mnemonic: 'dah-dit-dah-dit', description: 'Dash dot dash dot', isBuiltIn: true, unitIntroduced: 4, enabledForPractice: true, stats: createInitialStats() },

  { id: 'letter_w', char: 'W', morse: '.--', category: 'letter', mnemonic: 'dit-dah-dah', description: 'Dot dash dash', isBuiltIn: true, unitIntroduced: 5, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_g', char: 'G', morse: '--.', category: 'letter', mnemonic: 'dah-dah-dit', description: 'Dash dash dot', isBuiltIn: true, unitIntroduced: 5, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_y', char: 'Y', morse: '-.--', category: 'letter', mnemonic: 'dah-dit-dah-dah', description: 'Dash dot dash dash', isBuiltIn: true, unitIntroduced: 5, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_p', char: 'P', morse: '.--.', category: 'letter', mnemonic: 'dit-dah-dah-dit', description: 'Dot dash dash dot', isBuiltIn: true, unitIntroduced: 5, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_b', char: 'B', morse: '-...', category: 'letter', mnemonic: 'dah-dit-dit-dit', description: 'Dash dot dot dot', isBuiltIn: true, unitIntroduced: 5, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_v', char: 'V', morse: '...-', category: 'letter', mnemonic: 'dit-dit-dit-dah', description: 'Three dots then a dash (Beethoven 5th motif)', isBuiltIn: true, unitIntroduced: 5, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_f', char: 'F', morse: '..-.', category: 'letter', mnemonic: 'dit-dit-dah-dit', description: 'Dot dot dash dot', isBuiltIn: true, unitIntroduced: 5, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_q', char: 'Q', morse: '--.-', category: 'letter', mnemonic: 'dah-dah-dit-dah', description: 'Dash dash dot dash', isBuiltIn: true, unitIntroduced: 5, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_j', char: 'J', morse: '.---', category: 'letter', mnemonic: 'dit-dah-dah-dah', description: 'Dot dash dash dash', isBuiltIn: true, unitIntroduced: 5, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_x', char: 'X', morse: '-..-', category: 'letter', mnemonic: 'dah-dit-dit-dah', description: 'Dash dot dot dash', isBuiltIn: true, unitIntroduced: 5, enabledForPractice: true, stats: createInitialStats() },
  { id: 'letter_z', char: 'Z', morse: '--..', category: 'letter', mnemonic: 'dah-dah-dit-dit', description: 'Dash dash dot dot', isBuiltIn: true, unitIntroduced: 5, enabledForPractice: true, stats: createInitialStats() },

  // Digits (Unit 6)
  { id: 'digit_1', char: '1', morse: '.----', category: 'digit', mnemonic: 'dit-dah-dah-dah-dah', description: 'One dot, four dashes', isBuiltIn: true, unitIntroduced: 6, enabledForPractice: true, stats: createInitialStats() },
  { id: 'digit_2', char: '2', morse: '..---', category: 'digit', mnemonic: 'dit-dit-dah-dah-dah', description: 'Two dots, three dashes', isBuiltIn: true, unitIntroduced: 6, enabledForPractice: true, stats: createInitialStats() },
  { id: 'digit_3', char: '3', morse: '...--', category: 'digit', mnemonic: 'dit-dit-dit-dah-dah', description: 'Three dots, two dashes', isBuiltIn: true, unitIntroduced: 6, enabledForPractice: true, stats: createInitialStats() },
  { id: 'digit_4', char: '4', morse: '....-', category: 'digit', mnemonic: 'dit-dit-dit-dit-dah', description: 'Four dots, one dash', isBuiltIn: true, unitIntroduced: 6, enabledForPractice: true, stats: createInitialStats() },
  { id: 'digit_5', char: '5', morse: '.....', category: 'digit', mnemonic: 'dit-dit-dit-dit-dit', description: 'Five rapid dots', isBuiltIn: true, unitIntroduced: 6, enabledForPractice: true, stats: createInitialStats() },
  { id: 'digit_6', char: '6', morse: '-....', category: 'digit', mnemonic: 'dah-dit-dit-dit-dit', description: 'One dash, four dots', isBuiltIn: true, unitIntroduced: 6, enabledForPractice: true, stats: createInitialStats() },
  { id: 'digit_7', char: '7', morse: '--...', category: 'digit', mnemonic: 'dah-dah-dit-dit-dit', description: 'Two dashes, three dots', isBuiltIn: true, unitIntroduced: 6, enabledForPractice: true, stats: createInitialStats() },
  { id: 'digit_8', char: '8', morse: '---..', category: 'digit', mnemonic: 'dah-dah-dah-dit-dit', description: 'Three dashes, two dots', isBuiltIn: true, unitIntroduced: 6, enabledForPractice: true, stats: createInitialStats() },
  { id: 'digit_9', char: '9', morse: '----.', category: 'digit', mnemonic: 'dah-dah-dah-dah-dit', description: 'Four dashes, one dot', isBuiltIn: true, unitIntroduced: 6, enabledForPractice: true, stats: createInitialStats() },
  { id: 'digit_0', char: '0', morse: '-----', category: 'digit', mnemonic: 'dah-dah-dah-dah-dah', description: 'Five steady dashes', isBuiltIn: true, unitIntroduced: 6, enabledForPractice: true, stats: createInitialStats() },

  // Punctuation & Special Symbols (Unit 7)
  { id: 'punct_period', char: '.', morse: '.-.-.-', category: 'punctuation', mnemonic: 'period / full stop', description: 'Dot dash dot dash dot dash', isBuiltIn: true, unitIntroduced: 7, enabledForPractice: true, stats: createInitialStats() },
  { id: 'punct_comma', char: ',', morse: '--..--', category: 'punctuation', mnemonic: 'comma', description: 'Dash dash dot dot dash dash', isBuiltIn: true, unitIntroduced: 7, enabledForPractice: true, stats: createInitialStats() },
  { id: 'punct_question', char: '?', morse: '..--..', category: 'punctuation', mnemonic: 'question mark', description: 'Dot dot dash dash dot dot', isBuiltIn: true, unitIntroduced: 7, enabledForPractice: true, stats: createInitialStats() },
  { id: 'punct_slash', char: '/', morse: '-..-.', category: 'punctuation', mnemonic: 'slash / fraction bar', description: 'Dash dot dot dash dot', isBuiltIn: true, unitIntroduced: 7, enabledForPractice: true, stats: createInitialStats() },
  { id: 'punct_equal', char: '=', morse: '-...-', category: 'punctuation', mnemonic: 'equals / pause', description: 'Dash dot dot dot dash (break signal)', isBuiltIn: true, unitIntroduced: 7, enabledForPractice: true, stats: createInitialStats() },
  { id: 'punct_sos', char: 'SOS', morse: '...---...', category: 'punctuation', mnemonic: 'SOS distress signal', description: 'Universal maritime emergency call', isBuiltIn: true, unitIntroduced: 7, enabledForPractice: true, stats: createInitialStats() },
];
