import { calculateMastery, calculateSelectionPriority } from '../adaptive/adaptiveEngine';
import { validateImportData } from '../persistence/storage';
import {
  checkAnswer,
  detectPatternConflict,
  isValidMorsePattern,
  wpmToUnitMs,
} from './morseUtils';
import { MorseSymbol, SymbolStats } from '../../types/morse';

/**
 * Pure test assertions suite for core learning and audio math
 */
export function runSelfDiagnostics(): { passed: boolean; results: string[] } {
  const results: string[] = [];
  let allPassed = true;

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      results.push(`PASS: ${testName}`);
    } else {
      results.push(`FAIL: ${testName}`);
      allPassed = false;
    }
  };

  // 1. Morse Pattern Validation
  assert(isValidMorsePattern('.-'), 'Valid pattern ".-"');
  assert(isValidMorsePattern('...---...'), 'Valid SOS pattern');
  assert(!isValidMorsePattern(''), 'Empty pattern rejected');
  assert(!isValidMorsePattern('ABC'), 'Non-morse characters rejected');
  assert(!isValidMorsePattern('. -#'), 'Invalid characters rejected');

  // 2. Timing Conversion (PARIS standard)
  // At 15 WPM: 1200 / 15 = 80ms
  assert(wpmToUnitMs(15) === 80, '15 WPM yields 80ms unit');
  // At 20 WPM: 1200 / 20 = 60ms
  assert(wpmToUnitMs(20) === 60, '20 WPM yields 60ms unit');

  // 3. Answer Validation
  assert(checkAnswer('A', 'a'), 'Case-insensitive letter check');
  assert(checkAnswer('.-', '.-'), 'Morse pattern equality check');
  assert(checkAnswer('.-', ' .- '), 'Morse pattern with whitespace trimmed');
  assert(checkAnswer('.-', '•—'), 'Unicode dot and dash normalized');
  assert(checkAnswer('.-', '._'), 'Underscore converted to dash');
  assert(!checkAnswer('A', 'B'), 'Incorrect letter rejected');

  // 4. Custom Symbol Conflict Detection
  const mockSymbols: MorseSymbol[] = [
    {
      id: 'letter_a',
      char: 'A',
      morse: '.-',
      category: 'letter',
      isBuiltIn: true,
      enabledForPractice: true,
      stats: {
        attempts: 10,
        correct: 9,
        incorrect: 1,
        history: [],
        consecutiveCorrect: 4,
        avgResponseTimeMs: 1200,
        lastPracticed: Date.now(),
        masteryScore: 88,
        state: 'mastered',
        confusionCount: {},
        testedExerciseTypes: ['char_to_morse', 'audio_to_char'],
      },
    },
  ];

  const conflict1 = detectPatternConflict('.-', 'Z', mockSymbols);
  assert(conflict1.hasConflict && conflict1.isPatternDuplicate, 'Detects duplicate pattern ".-"');

  const conflict2 = detectPatternConflict('...-', 'A', mockSymbols);
  assert(conflict2.hasConflict && conflict2.isCharDuplicate, 'Detects duplicate char "A"');

  const conflict3 = detectPatternConflict('...-', 'Z', mockSymbols);
  assert(!conflict3.hasConflict, 'Permits unique char and pattern');

  // 5. Mastery Calculation
  const masterStats: SymbolStats = {
    attempts: 10,
    correct: 10,
    incorrect: 0,
    history: Array(10).fill({ timestamp: Date.now(), correct: true, responseTimeMs: 1000, exerciseType: 'char_to_morse', userResponse: 'A' }),
    consecutiveCorrect: 5,
    avgResponseTimeMs: 900,
    lastPracticed: Date.now(),
    masteryScore: 0,
    state: 'new',
    confusionCount: {},
    testedExerciseTypes: ['char_to_morse', 'audio_to_char'],
  };
  const masteryResult = calculateMastery(masterStats);
  assert(masteryResult.score >= 85, 'Mastery score reaches high threshold for flawless record');
  assert(masteryResult.state === 'mastered', 'State advances to mastered');

  // 6. Selection Priority
  const weakSym = { ...mockSymbols[0], stats: { ...mockSymbols[0].stats, masteryScore: 20, lastPracticed: null } };
  const priority = calculateSelectionPriority(weakSym);
  assert(priority > 50, 'Low mastery and unpracticed state yields elevated priority');

  // 7. Persistence and Import Validation
  const validJson = JSON.stringify({
    version: 2,
    symbols: mockSymbols,
    userProgress: { xp: 100, streak: 3 },
  });
  assert(validateImportData(validJson).valid, 'Valid backup JSON parses correctly');
  assert(!validateImportData('{ invalid json').valid, 'Malformed JSON rejected');
  assert(!validateImportData(JSON.stringify({ bad: 123 })).valid, 'Missing symbols rejected');

  return { passed: allPassed, results };
}
