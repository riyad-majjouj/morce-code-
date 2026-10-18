export type SymbolCategory = 'letter' | 'digit' | 'punctuation' | 'custom';
export type MasteryState = 'new' | 'learning' | 'reviewing' | 'mastered';

export type ExerciseType =
  | 'char_to_morse'
  | 'morse_to_char'
  | 'audio_to_char'
  | 'char_to_audio'
  | 'multiple_choice'
  | 'listening_dictation'
  | 'word_decoding'
  | 'word_encoding'
  | 'audio_to_word'
  | 'timed_blitz'
  | 'reverse_production'
  | 'manual_keying'
  | 'custom_practice';

export interface AnswerHistoryRecord {
  timestamp: number;
  correct: boolean;
  responseTimeMs: number;
  exerciseType: ExerciseType;
  userResponse: string;
}

export interface SymbolStats {
  attempts: number;
  correct: number;
  incorrect: number;
  history: AnswerHistoryRecord[];
  consecutiveCorrect: number;
  avgResponseTimeMs: number;
  lastPracticed: number | null;
  masteryScore: number; // 0 - 100
  state: MasteryState;
  confusionCount: Record<string, number>; // symbolId -> count of times selected incorrectly instead
  testedExerciseTypes: ExerciseType[];
}

export interface MorseSymbol {
  id: string;
  char: string;
  morse: string; // e.g. ".-"
  category: SymbolCategory;
  description?: string;
  mnemonic?: string; // e.g. "dit-dah"
  isBuiltIn: boolean;
  unitIntroduced?: number;
  enabledForPractice: boolean;
  includeInCurriculum?: boolean;
  createdAt?: number;
  stats: SymbolStats;
}

export interface LessonConfig {
  id: string;
  unitId: string;
  lessonNumber: number;
  title: string;
  description: string;
  targetSymbolIds: string[];
  reviewSymbolIds: string[];
  xpReward: number;
  minPassingScore: number; // e.g. 80
  totalExercises: number; // usually 6 to 10
}

export interface CurriculumUnit {
  id: string;
  unitNumber: number;
  title: string;
  subtitle: string;
  description: string;
  symbolIds: string[];
  lessons: LessonConfig[];
  color: string; // Tailwind color accent
}

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  score: number;
  bestScore: number;
  stars: number; // 1 - 3
  attemptsCount: number;
  lastAttemptTimestamp: number;
}

export interface UserProgress {
  xp: number;
  streak: number;
  lastActiveDate: string; // "YYYY-MM-DD"
  dailyGoalXp: number;
  todayXp: number;
  todayDate: string; // "YYYY-MM-DD"
  totalPracticeTimeSec: number;
  completedLessons: Record<string, LessonProgress>;
  unlockedLessonIds: string[];
  currentLessonId: string;
  achievements: Record<string, { unlocked: boolean; unlockedAt?: number }>;
  exerciseTypeStats: Record<ExerciseType, { attempts: number; correct: number }>;
}

export interface UserSettings {
  soundEffects: boolean;
  toneFrequency: number; // e.g. 650 Hz
  wpm: number; // Words Per Minute (e.g. 15)
  volume: number; // 0.0 - 1.0
  autoPlayAudio: boolean;
  showVisualHints: boolean;
  dailyGoalXp: number;
  keyCalibrationDotMaxMs: number; // Press duration threshold under which it's a dot (e.g. 180ms)
  keyCalibrationPauseMs: number; // Inter-character gap before grouping (e.g. 400ms)
  practiceDifficulty: 'easy' | 'medium' | 'hard';
  enabledExerciseTypes: ExerciseType[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'streak' | 'xp' | 'accuracy' | 'mastery' | 'custom';
  targetValue: number;
  progressValue: (progress: UserProgress, symbols: MorseSymbol[]) => number;
  isUnlocked: (progress: UserProgress, symbols: MorseSymbol[]) => boolean;
}

export interface GeneratedExercise {
  id: string;
  type: ExerciseType;
  prompt: string;
  subPrompt?: string;
  symbol: MorseSymbol;
  expectedMorse: string;
  expectedChar: string;
  options?: string[]; // for multiple choice
  audioOnly?: boolean;
  sequence?: MorseSymbol[]; // for dictation or word decoding
  word?: string;
  targetWord?: string;
  wordMorse?: string;
  hint?: string;
}
