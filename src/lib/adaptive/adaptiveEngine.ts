import { CURRICULUM } from '../../data/curriculum';
import { getEligibleWords } from '../../data/curriculumWords';
import { ExerciseType, GeneratedExercise, MorseSymbol, SymbolStats, UserProgress } from '../../types/morse';
import { encodeTextToMorse } from '../morse/morseUtils';

/**
 * Returns strictly the symbols the learner has unlocked or practiced so far.
 * Used to restrict practice modes to only known symbols.
 */
export function getLearnedSymbols(symbols: MorseSymbol[], userProgress: UserProgress): MorseSymbol[] {
  const completedLessonIds = Object.keys(userProgress.completedLessons || {});
  const learnedIdsFromLessons = new Set<string>();

  CURRICULUM.forEach(unit => {
    unit.lessons.forEach(lesson => {
      if (completedLessonIds.includes(lesson.id)) {
        lesson.targetSymbolIds.forEach(id => learnedIdsFromLessons.add(id));
      }
    });
  });

  const learned = symbols.filter(s => {
    if (!s.enabledForPractice) return false;
    if (learnedIdsFromLessons.has(s.id)) return true;
    if (s.stats.attempts > 0 || s.stats.masteryScore > 0 || s.stats.state !== 'new') return true;
    if (!s.isBuiltIn) return true; // custom symbols
    return false;
  });

  if (learned.length === 0) {
    return symbols.filter(s => s.id === 'letter_e' || s.id === 'letter_t');
  }

  return learned;
}

/**
 * Calculates mastery score (0-100) and learning state based on comprehensive metrics:
 * - Total attempts (minimum 6 for full mastery consideration)
 * - Recent accuracy (last 10 attempts)
 * - Consecutive correct answers
 * - Multi-exercise type breadth (tested across >= 2 exercise types)
 * - Time decay since last practiced
 */
export function calculateMastery(stats: SymbolStats): { score: number; state: SymbolStats['state'] } {
  if (stats.attempts === 0) {
    return { score: 0, state: 'new' };
  }

  // 1. Accuracy factor (0 - 40 points)
  const recentHistory = stats.history.slice(-10);
  const recentAttempts = recentHistory.length;
  const recentCorrect = recentHistory.filter(h => h.correct).length;
  const recentAccuracy = recentAttempts > 0 ? recentCorrect / recentAttempts : 0;
  const accuracyScore = recentAccuracy * 40;

  // 2. Volume & Experience factor (0 - 25 points)
  const volumeScore = Math.min(25, (stats.attempts / 8) * 25);

  // 3. Streak factor (0 - 20 points)
  const streakScore = Math.min(20, (stats.consecutiveCorrect / 3) * 20);

  // 4. Modality / Exercise breadth factor (0 - 15 points)
  const breadthScore = Math.min(15, (stats.testedExerciseTypes.length / 2) * 15);

  let rawScore = Math.round(accuracyScore + volumeScore + streakScore + breadthScore);

  // 5. Time decay: if last practiced > 48 hours ago, slight decay to trigger review
  const now = Date.now();
  if (stats.lastPracticed) {
    const hoursSince = (now - stats.lastPracticed) / (1000 * 60 * 60);
    if (hoursSince > 72) {
      rawScore = Math.max(20, rawScore - 15);
    } else if (hoursSince > 24) {
      rawScore = Math.max(20, rawScore - 8);
    }
  }

  const finalScore = Math.min(100, Math.max(0, rawScore));

  // Determine State
  let state: SymbolStats['state'] = 'learning';
  if (stats.attempts === 0) {
    state = 'new';
  } else if (
    finalScore >= 85 &&
    stats.attempts >= 6 &&
    recentAccuracy >= 0.85 &&
    stats.consecutiveCorrect >= 3 &&
    stats.testedExerciseTypes.length >= 2
  ) {
    state = 'mastered';
  } else if (stats.lastPracticed && (now - stats.lastPracticed) / (1000 * 60 * 60) > 48) {
    state = 'reviewing';
  } else {
    state = 'learning';
  }

  return { score: finalScore, state };
}

/**
 * Calculates selection priority (0-100) using the deterministic weighting formula:
 * priority = 0.35 * (100 - masteryScore) + 0.30 * recentErrorRate + 0.20 * reviewUrgency + 0.15 * confusionScore
 */
export function calculateSelectionPriority(
  symbol: MorseSymbol,
  allSymbols: MorseSymbol[] = []
): number {
  const stats = symbol.stats;

  // Component 1: Mastery deficiency (0 - 100)
  const masteryDeficiency = 100 - (stats.masteryScore || 0);

  // Component 2: Recent error rate (0 - 100)
  const recentHistory = stats.history.slice(-8);
  let recentErrorRate = 50;
  if (recentHistory.length > 0) {
    const incorrect = recentHistory.filter(h => !h.correct).length;
    recentErrorRate = (incorrect / recentHistory.length) * 100;
  }

  // Component 3: Review urgency (0 - 100)
  let reviewUrgency = 10;
  if (!stats.lastPracticed) {
    reviewUrgency = 80;
  } else {
    const hoursSince = (Date.now() - stats.lastPracticed) / (1000 * 60 * 60);
    if (hoursSince > 72) reviewUrgency = 100;
    else if (hoursSince > 24) reviewUrgency = 70;
    else if (hoursSince > 6) reviewUrgency = 40;
    else reviewUrgency = 15;
  }

  // Component 4: Confusion score (0 - 100)
  const totalConfusions = Object.values(stats.confusionCount || {}).reduce((a, b) => a + b, 0);
  const confusionScore = Math.min(100, totalConfusions * 25);

  const priority =
    0.35 * masteryDeficiency +
    0.30 * recentErrorRate +
    0.20 * reviewUrgency +
    0.15 * confusionScore;

  return Math.min(100, Math.max(0, Math.round(priority)));
}

/**
 * Generates plausible distractors for multiple choice questions.
 */
export function getDistractors(
  targetSymbol: MorseSymbol,
  eligibleSymbols: MorseSymbol[],
  count: number = 3
): MorseSymbol[] {
  const others = eligibleSymbols.filter(s => s.id !== targetSymbol.id);
  if (others.length <= count) return others;

  const scored = others.map(s => {
    let similarity = 0;
    if (s.morse.length === targetSymbol.morse.length) similarity += 3;
    if (s.morse === targetSymbol.morse.split('').reverse().join('')) similarity += 5;
    if (s.morse[0] === targetSymbol.morse[0]) similarity += 2;
    if (s.category === targetSymbol.category) similarity += 1;
    if (targetSymbol.stats.confusionCount?.[s.id]) {
      similarity += targetSymbol.stats.confusionCount[s.id] * 4;
    }
    return { symbol: s, score: similarity };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map(x => x.symbol);
}

/**
 * Generates an adaptive exercise based on the target symbol pool and user performance.
 * Incorporates challenging word encoding and audio word decoding composed exclusively of learned symbols.
 */
export function generateExercise(
  targetSymbols: MorseSymbol[],
  allEligibleSymbols: MorseSymbol[],
  preferredType?: ExerciseType,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): GeneratedExercise {
  if (targetSymbols.length === 0) {
    throw new Error('Target symbols cannot be empty for exercise generation.');
  }

  // Pick target symbol with weighted priority
  const weighted = targetSymbols.map(sym => ({
    symbol: sym,
    weight: Math.max(10, calculateSelectionPriority(sym, allEligibleSymbols)),
  }));

  const totalWeight = weighted.reduce((acc, curr) => acc + curr.weight, 0);
  let random = Math.random() * totalWeight;
  let selected = weighted[0].symbol;

  for (const item of weighted) {
    if (random < item.weight) {
      selected = item.symbol;
      break;
    }
    random -= item.weight;
  }

  // Determine exercise type
  let type: ExerciseType = preferredType || 'char_to_morse';
  if (!preferredType) {
    const mastery = selected.stats.masteryScore;

    if (mastery < 30 || difficulty === 'easy') {
      const beginnerTypes: ExerciseType[] = ['char_to_morse', 'morse_to_char', 'multiple_choice', 'reverse_production'];
      type = beginnerTypes[Math.floor(Math.random() * beginnerTypes.length)];
    } else if (mastery < 70 || difficulty === 'medium') {
      // Intermediate: Introduce audio listening, telegraph keying, reverse production, and word exercises if eligible
      const intermediateTypes: ExerciseType[] = [
        'audio_to_char',
        'reverse_production',
        'manual_keying',
        'multiple_choice',
        'char_to_morse',
        'word_encoding',
      ];
      type = intermediateTypes[Math.floor(Math.random() * intermediateTypes.length)];
    } else {
      // Advanced / Hard: Pure audio word decoding, telegraph word transmission, manual keying, dictation
      const advancedTypes: ExerciseType[] = [
        'audio_to_word',
        'word_encoding',
        'audio_to_char',
        'manual_keying',
        'listening_dictation',
      ];
      type = advancedTypes[Math.floor(Math.random() * advancedTypes.length)];
    }
  }

  // Generate options for multiple choice
  const distractors = getDistractors(selected, allEligibleSymbols.length > 3 ? allEligibleSymbols : targetSymbols, 3);
  const optionsPool = [selected, ...distractors];
  optionsPool.sort(() => Math.random() - 0.5);

  let prompt = '';
  let subPrompt = '';
  let targetWord: string | undefined;
  let wordMorse: string | undefined;

  // Learned characters pool available for building words
  const learnedChars = Array.from(new Set(allEligibleSymbols.map(s => s.char.toUpperCase())));

  // Handle challenging word translation exercises
  if (type === 'word_encoding' || type === 'word_decoding' || type === 'audio_to_word') {
    const eligibleWords = getEligibleWords(learnedChars);
    targetWord = eligibleWords[Math.floor(Math.random() * eligibleWords.length)];
    wordMorse = encodeTextToMorse(targetWord, allEligibleSymbols);
  }

  switch (type) {
    case 'char_to_morse':
      prompt = `Select the Morse code for "${selected.char}"`;
      subPrompt = 'Enter or select the correct dot and dash pattern.';
      break;

    case 'morse_to_char':
      prompt = `What character does this Morse pattern represent?`;
      subPrompt = selected.morse;
      break;

    case 'audio_to_char':
      prompt = `Listen carefully. Which symbol was transmitted?`;
      subPrompt = 'Audio transmission active. Key or choose the decoded character.';
      break;

    case 'reverse_production':
      prompt = `Construct the Morse pattern for "${selected.char}"`;
      subPrompt = 'Use Spacebar, Telegraph knob, or Dot/Dash buttons.';
      break;

    case 'manual_keying':
      prompt = `Transmit "${selected.char}" on the Telegraph Key`;
      subPrompt = 'Key the symbol using Spacebar, knob, or Dot/Dash buttons.';
      break;

    case 'multiple_choice':
      prompt = `Match "${selected.char}" to its Morse code:`;
      subPrompt = 'Choose the matching transmission.';
      break;

    case 'listening_dictation':
      prompt = `Audio Dictation: Transcribe the received character`;
      subPrompt = 'Listen to the transmission and enter the decoded character.';
      break;

    case 'word_encoding':
      prompt = `Transmit the word "${targetWord}" in Morse code`;
      subPrompt = `Translate each letter of "${targetWord}" using Spacebar, Telegraph Key, or Dot/Dash. (Separate letters with space)`;
      break;

    case 'audio_to_word':
      prompt = `Audio Word Decoding: Decode the transmitted word`;
      subPrompt = `Listen to the full Morse transmission and type the decoded word.`;
      break;

    case 'word_decoding':
      prompt = `Decode the Morse word: ${wordMorse}`;
      subPrompt = `Read the Morse pattern and enter the decoded English word.`;
      break;

    default:
      prompt = `Identify "${selected.char}"`;
      subPrompt = '';
      break;
  }

  return {
    id: `ex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    prompt,
    subPrompt,
    symbol: selected,
    expectedMorse: (type === 'word_encoding' || type === 'audio_to_word' || type === 'word_decoding') && wordMorse ? wordMorse : selected.morse,
    expectedChar: (type === 'word_encoding' || type === 'audio_to_word' || type === 'word_decoding') && targetWord ? targetWord : selected.char,
    targetWord,
    wordMorse,
    options: optionsPool.map(o => (type === 'char_to_morse' || type === 'multiple_choice' ? o.morse : o.char)),
    audioOnly: type === 'audio_to_char' || type === 'listening_dictation' || type === 'audio_to_word',
    // Per user instructions, remove dit-dah/mnemonics so learner must distinguish by ear/memory
    hint: undefined,
  };
}
