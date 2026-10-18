import { CURRICULUM } from '../../data/curriculum';
import { DEFAULT_SYMBOLS } from '../../data/defaultSymbols';
import { ExerciseType, MorseSymbol, UserProgress, UserSettings } from '../../types/morse';

const STORAGE_KEY = 'morselingo_v2_store';

export interface AppStoredState {
  version: number;
  symbols: MorseSymbol[];
  userProgress: UserProgress;
  userSettings: UserSettings;
}

export const getTodayDateString = (): string => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export const DEFAULT_SETTINGS: UserSettings = {
  soundEffects: true,
  toneFrequency: 650,
  wpm: 15,
  volume: 0.75,
  autoPlayAudio: true,
  showVisualHints: true,
  dailyGoalXp: 30,
  keyCalibrationDotMaxMs: 180,
  keyCalibrationPauseMs: 380,
  practiceDifficulty: 'medium',
  enabledExerciseTypes: [
    'char_to_morse',
    'morse_to_char',
    'audio_to_char',
    'multiple_choice',
    'reverse_production',
    'manual_keying',
    'listening_dictation',
    'word_encoding',
    'audio_to_word',
  ],
};

const DEFAULT_EXERCISE_STATS: Record<ExerciseType, { attempts: number; correct: number }> = {
  char_to_morse: { attempts: 0, correct: 0 },
  morse_to_char: { attempts: 0, correct: 0 },
  audio_to_char: { attempts: 0, correct: 0 },
  char_to_audio: { attempts: 0, correct: 0 },
  multiple_choice: { attempts: 0, correct: 0 },
  listening_dictation: { attempts: 0, correct: 0 },
  word_decoding: { attempts: 0, correct: 0 },
  word_encoding: { attempts: 0, correct: 0 },
  audio_to_word: { attempts: 0, correct: 0 },
  timed_blitz: { attempts: 0, correct: 0 },
  reverse_production: { attempts: 0, correct: 0 },
  manual_keying: { attempts: 0, correct: 0 },
  custom_practice: { attempts: 0, correct: 0 },
};

export const getDefaultProgress = (): UserProgress => {
  const today = getTodayDateString();
  return {
    xp: 0,
    streak: 0,
    lastActiveDate: '',
    dailyGoalXp: 30,
    todayXp: 0,
    todayDate: today,
    totalPracticeTimeSec: 0,
    completedLessons: {},
    unlockedLessonIds: ['lesson_1_1'], // First lesson unlocked by default
    currentLessonId: 'lesson_1_1',
    achievements: {},
    exerciseTypeStats: DEFAULT_EXERCISE_STATS,
  };
};

export function loadStoredState(): AppStoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        version: 2,
        symbols: DEFAULT_SYMBOLS,
        userProgress: getDefaultProgress(),
        userSettings: DEFAULT_SETTINGS,
      };
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON format');
    }

    // Merge symbols so any new default symbols are retained while keeping user stats and custom symbols
    const storedSymbols: MorseSymbol[] = Array.isArray(parsed.symbols) ? parsed.symbols : [];
    const symbolMap = new Map<string, MorseSymbol>();

    // 1. Load built-in symbols with updated references
    DEFAULT_SYMBOLS.forEach(def => symbolMap.set(def.id, { ...def }));

    // 2. Overlay stored stats and custom symbols
    storedSymbols.forEach(stored => {
      if (stored.isBuiltIn && symbolMap.has(stored.id)) {
        const existing = symbolMap.get(stored.id)!;
        symbolMap.set(stored.id, {
          ...existing,
          enabledForPractice: stored.enabledForPractice ?? true,
          stats: {
            ...existing.stats,
            ...stored.stats,
            confusionCount: stored.stats?.confusionCount || {},
            testedExerciseTypes: stored.stats?.testedExerciseTypes || [],
            history: stored.stats?.history || [],
          },
        });
      } else if (!stored.isBuiltIn) {
        // Custom symbol
        symbolMap.set(stored.id, stored);
      }
    });

    // Check and update daily streak
    const progress: UserProgress = {
      ...getDefaultProgress(),
      ...(parsed.userProgress || {}),
      exerciseTypeStats: {
        ...DEFAULT_EXERCISE_STATS,
        ...(parsed.userProgress?.exerciseTypeStats || {}),
      },
    };

    const today = getTodayDateString();
    if (progress.todayDate !== today) {
      progress.todayDate = today;
      progress.todayXp = 0;
    }

    const settings: UserSettings = {
      ...DEFAULT_SETTINGS,
      ...(parsed.userSettings || {}),
    };

    return {
      version: 2,
      symbols: Array.from(symbolMap.values()),
      userProgress: progress,
      userSettings: settings,
    };
  } catch (err) {
    console.error('Failed to load stored Morse state, falling back to defaults:', err);
    return {
      version: 2,
      symbols: DEFAULT_SYMBOLS,
      userProgress: getDefaultProgress(),
      userSettings: DEFAULT_SETTINGS,
    };
  }
}

export function saveStoredState(state: AppStoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save Morse state to LocalStorage:', err);
  }

  // Also persist reliably to IndexedDB asynchronously
  import('./indexedDb').then(({ idbSet }) => {
    idbSet('morselingo_state', state).catch((err) => {
      console.warn('Failed to save to IndexedDB:', err);
    });
  });
}

export async function loadStoredStateAsync(): Promise<AppStoredState> {
  try {
    const { idbGet, idbSet } = await import('./indexedDb');
    const idbState = await idbGet<AppStoredState>('morselingo_state');
    if (idbState && idbState.symbols && idbState.userProgress) {
      return idbState;
    }
    // If not in IndexedDB, load from localStorage and migrate to IndexedDB
    const localState = loadStoredState();
    await idbSet('morselingo_state', localState);
    return localState;
  } catch (err) {
    console.warn('Error reading from IndexedDB, falling back to synchronous load:', err);
    return loadStoredState();
  }
}

export function exportAppStateJSON(state: AppStoredState): string {
  return JSON.stringify(state, null, 2);
}

export function validateImportData(jsonStr: string): { valid: boolean; error?: string; state?: AppStoredState } {
  try {
    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'File is not a valid JSON object.' };
    }
    if (!Array.isArray(data.symbols)) {
      return { valid: false, error: 'Missing or invalid "symbols" array.' };
    }
    if (!data.userProgress || typeof data.userProgress !== 'object') {
      return { valid: false, error: 'Missing or invalid "userProgress" object.' };
    }

    // Check symbols format
    for (const sym of data.symbols) {
      if (!sym.id || !sym.char || !sym.morse) {
        return { valid: false, error: `Malformed symbol entry: ${JSON.stringify(sym).substring(0, 50)}...` };
      }
    }

    const sanitizedState: AppStoredState = {
      version: data.version || 2,
      symbols: data.symbols,
      userProgress: {
        ...getDefaultProgress(),
        ...data.userProgress,
      },
      userSettings: {
        ...DEFAULT_SETTINGS,
        ...(data.userSettings || {}),
      },
    };

    return { valid: true, state: sanitizedState };
  } catch (e: unknown) {
    const err = e as Error;
    return { valid: false, error: err.message || 'JSON parse error' };
  }
}

export function clearStoredState(): AppStoredState {
  localStorage.removeItem(STORAGE_KEY);
  import('./indexedDb').then(({ idbDelete }) => {
    idbDelete('morselingo_state').catch(console.warn);
  });
  return {
    version: 2,
    symbols: DEFAULT_SYMBOLS,
    userProgress: getDefaultProgress(),
    userSettings: DEFAULT_SETTINGS,
  };
}
