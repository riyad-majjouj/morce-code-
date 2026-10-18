import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { ACHIEVEMENTS } from '../data/achievements';
import { CURRICULUM } from '../data/curriculum';
import { calculateMastery } from '../lib/adaptive/adaptiveEngine';
import { morseAudio } from '../lib/audio/morseAudio';
import {
  AppStoredState,
  clearStoredState,
  getTodayDateString,
  loadStoredState,
  loadStoredStateAsync,
  saveStoredState,
} from '../lib/persistence/storage';
import {
  ExerciseType,
  LessonConfig,
  MorseSymbol,
  SymbolCategory,
  UserProgress,
  UserSettings,
} from '../types/morse';

interface PracticeConfig {
  type: ExerciseType;
  customOnly?: boolean;
  targetSymbolId?: string;
}

interface AppContextValue {
  symbols: MorseSymbol[];
  userProgress: UserProgress;
  userSettings: UserSettings;
  activeTab: 'learn' | 'practice' | 'library' | 'stats' | 'settings';
  setActiveTab: (tab: 'learn' | 'practice' | 'library' | 'stats' | 'settings') => void;
  activeLessonModal: LessonConfig | null;
  startLesson: (lesson: LessonConfig) => void;
  closeLessonModal: () => void;
  activePracticeModal: PracticeConfig | null;
  startPractice: (type: ExerciseType, options?: { customOnly?: boolean; targetSymbolId?: string }) => void;
  closePracticeModal: () => void;
  recordAnswer: (params: {
    symbolId: string;
    correct: boolean;
    responseTimeMs: number;
    exerciseType: ExerciseType;
    userResponse: string;
    confusedWithSymbolId?: string;
  }) => void;
  completeLessonSession: (params: { lessonId: string; score: number; xpEarned: number }) => void;
  createCustomSymbol: (data: {
    char: string;
    morse: string;
    category: SymbolCategory;
    description?: string;
    mnemonic?: string;
    includeInCurriculum?: boolean;
  }) => MorseSymbol;
  updateCustomSymbol: (id: string, updates: Partial<MorseSymbol>) => void;
  deleteCustomSymbol: (id: string) => void;
  toggleSymbolEnabled: (id: string, enabled?: boolean) => void;
  updateSettings: (updates: Partial<UserSettings>) => void;
  resetAllProgress: () => void;
  importState: (newState: AppStoredState) => void;
  selectedSymbolForDetail: MorseSymbol | null;
  setSelectedSymbolForDetail: (symbol: MorseSymbol | null) => void;
  recentAchievementUnlocked: string | null;
  dismissAchievement: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [initialData] = useState<AppStoredState>(() => loadStoredState());
  const [symbols, setSymbols] = useState<MorseSymbol[]>(initialData.symbols);
  const [userProgress, setUserProgress] = useState<UserProgress>(initialData.userProgress);
  const [userSettings, setUserSettings] = useState<UserSettings>(initialData.userSettings);

  const [activeTab, setActiveTab] = useState<'learn' | 'practice' | 'library' | 'stats' | 'settings'>('learn');
  const [activeLessonModal, setActiveLessonModal] = useState<LessonConfig | null>(null);
  const [activePracticeModal, setActivePracticeModal] = useState<PracticeConfig | null>(null);
  const [selectedSymbolForDetail, setSelectedSymbolForDetail] = useState<MorseSymbol | null>(null);
  const [recentAchievementUnlocked, setRecentAchievementUnlocked] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Hydrate from IndexedDB on initial mount
  useEffect(() => {
    loadStoredStateAsync().then((state) => {
      if (state && state.symbols && state.userProgress) {
        setSymbols(state.symbols);
        setUserProgress(state.userProgress);
        setUserSettings(state.userSettings);
      }
    }).catch(console.warn);
  }, []);

  // Save to LocalStorage whenever critical data changes
  useEffect(() => {
    saveStoredState({
      version: 2,
      symbols,
      userProgress,
      userSettings,
    });
  }, [symbols, userProgress, userSettings]);

  // Check achievements
  useEffect(() => {
    ACHIEVEMENTS.forEach(ach => {
      const already = userProgress.achievements[ach.id]?.unlocked;
      if (!already && ach.isUnlocked(userProgress, symbols)) {
        setUserProgress(prev => ({
          ...prev,
          achievements: {
            ...prev.achievements,
            [ach.id]: { unlocked: true, unlockedAt: Date.now() },
          },
        }));
        setRecentAchievementUnlocked(ach.title);
        if (userSettings.soundEffects) {
          morseAudio.playFanfareSound(userSettings.volume);
        }
      }
    });
  }, [symbols, userProgress, userSettings]);

  const dismissAchievement = () => {
    setRecentAchievementUnlocked(null);
  };

  const startLesson = (lesson: LessonConfig) => {
    setActiveLessonModal(lesson);
  };

  const closeLessonModal = () => {
    setActiveLessonModal(null);
  };

  const startPractice = (type: ExerciseType, options?: { customOnly?: boolean; targetSymbolId?: string }) => {
    setActivePracticeModal({ type, ...options });
  };

  const closePracticeModal = () => {
    setActivePracticeModal(null);
  };

  const recordAnswer = ({
    symbolId,
    correct,
    responseTimeMs,
    exerciseType,
    userResponse,
    confusedWithSymbolId,
  }: {
    symbolId: string;
    correct: boolean;
    responseTimeMs: number;
    exerciseType: ExerciseType;
    userResponse: string;
    confusedWithSymbolId?: string;
  }) => {
    const now = Date.now();
    const today = getTodayDateString();

    // 1. Update Symbol Statistics
    setSymbols(prevSymbols =>
      prevSymbols.map(sym => {
        if (sym.id !== symbolId) return sym;

        const prevStats = sym.stats;
        const attempts = prevStats.attempts + 1;
        const correctCount = prevStats.correct + (correct ? 1 : 0);
        const incorrectCount = prevStats.incorrect + (correct ? 0 : 1);
        const consecutiveCorrect = correct ? prevStats.consecutiveCorrect + 1 : 0;

        const newHistory = [
          ...prevStats.history,
          { timestamp: now, correct, responseTimeMs, exerciseType, userResponse },
        ].slice(-25); // retain last 25

        const totalTime = prevStats.avgResponseTimeMs * prevStats.attempts + responseTimeMs;
        const avgResponseTimeMs = Math.round(totalTime / attempts);

        const testedExerciseTypes = prevStats.testedExerciseTypes.includes(exerciseType)
          ? prevStats.testedExerciseTypes
          : [...prevStats.testedExerciseTypes, exerciseType];

        const confusionCount = { ...(prevStats.confusionCount || {}) };
        if (!correct && confusedWithSymbolId) {
          confusionCount[confusedWithSymbolId] = (confusionCount[confusedWithSymbolId] || 0) + 1;
        }

        const draftStats = {
          ...prevStats,
          attempts,
          correct: correctCount,
          incorrect: incorrectCount,
          history: newHistory,
          consecutiveCorrect,
          avgResponseTimeMs,
          lastPracticed: now,
          testedExerciseTypes,
          confusionCount,
        };

        const { score, state } = calculateMastery(draftStats);

        return {
          ...sym,
          stats: {
            ...draftStats,
            masteryScore: score,
            state,
          },
        };
      })
    );

    // 2. Update User Progress (XP, Streak, Exercise Stats)
    setUserProgress(prev => {
      let streak = prev.streak;
      let lastActiveDate = prev.lastActiveDate;

      if (lastActiveDate !== today) {
        if (!lastActiveDate) {
          streak = 1;
        } else {
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          if (lastActiveDate === yesterday) {
            streak += 1;
          } else if (lastActiveDate < yesterday) {
            streak = 1;
          }
        }
        lastActiveDate = today;
      }

      const gainedXp = correct ? 10 : 2;
      const todayXp = prev.todayDate === today ? prev.todayXp + gainedXp : gainedXp;

      const currentExStats = prev.exerciseTypeStats[exerciseType] || { attempts: 0, correct: 0 };
      const updatedExStats = {
        ...prev.exerciseTypeStats,
        [exerciseType]: {
          attempts: currentExStats.attempts + 1,
          correct: currentExStats.correct + (correct ? 1 : 0),
        },
      };

      return {
        ...prev,
        xp: prev.xp + gainedXp,
        streak,
        lastActiveDate,
        todayXp,
        todayDate: today,
        totalPracticeTimeSec: prev.totalPracticeTimeSec + Math.round(responseTimeMs / 1000),
        exerciseTypeStats: updatedExStats,
      };
    });
  };

  const completeLessonSession = ({
    lessonId,
    score,
    xpEarned,
  }: {
    lessonId: string;
    score: number;
    xpEarned: number;
  }) => {
    setUserProgress(prev => {
      const existing = prev.completedLessons[lessonId];
      const attemptsCount = (existing?.attemptsCount || 0) + 1;
      const bestScore = Math.max(existing?.bestScore || 0, score);
      const stars = score >= 95 ? 3 : score >= 85 ? 2 : 1;

      const updatedCompleted = {
        ...prev.completedLessons,
        [lessonId]: {
          lessonId,
          completed: score >= 80,
          score,
          bestScore,
          stars,
          attemptsCount,
          lastAttemptTimestamp: Date.now(),
        },
      };

      // Check unlocking next lesson
      const unlocked = new Set(prev.unlockedLessonIds);
      if (score >= 80) {
        let foundCurrent = false;
        let nextLessonIdToUnlock: string | null = null;

        for (const unit of CURRICULUM) {
          for (const l of unit.lessons) {
            if (foundCurrent) {
              nextLessonIdToUnlock = l.id;
              break;
            }
            if (l.id === lessonId) {
              foundCurrent = true;
            }
          }
          if (nextLessonIdToUnlock) break;
        }

        if (nextLessonIdToUnlock) {
          unlocked.add(nextLessonIdToUnlock);
        }
      }

      return {
        ...prev,
        xp: prev.xp + xpEarned,
        todayXp: prev.todayXp + xpEarned,
        completedLessons: updatedCompleted,
        unlockedLessonIds: Array.from(unlocked),
      };
    });
  };

  const createCustomSymbol = ({
    char,
    morse,
    category,
    description,
    mnemonic,
    includeInCurriculum = true,
  }: {
    char: string;
    morse: string;
    category: SymbolCategory;
    description?: string;
    mnemonic?: string;
    includeInCurriculum?: boolean;
  }): MorseSymbol => {
    const id = `custom_${Date.now()}_${char.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const newSymbol: MorseSymbol = {
      id,
      char: char.trim().toUpperCase(),
      morse: morse.trim(),
      category: category || 'custom',
      description: description?.trim() || 'Custom user-created Morse symbol',
      mnemonic: mnemonic?.trim() || morse.trim(),
      isBuiltIn: false,
      enabledForPractice: true,
      includeInCurriculum,
      createdAt: Date.now(),
      stats: {
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
      },
    };

    setSymbols(prev => [newSymbol, ...prev]);
    return newSymbol;
  };

  const updateCustomSymbol = (id: string, updates: Partial<MorseSymbol>) => {
    setSymbols(prev =>
      prev.map(s => {
        if (s.id !== id || s.isBuiltIn) return s;
        return { ...s, ...updates };
      })
    );
  };

  const deleteCustomSymbol = (id: string) => {
    setSymbols(prev => prev.filter(s => s.id !== id || s.isBuiltIn));
  };

  const toggleSymbolEnabled = (id: string, enabled?: boolean) => {
    setSymbols(prev =>
      prev.map(s => {
        if (s.id !== id) return s;
        const targetState = enabled !== undefined ? enabled : !s.enabledForPractice;
        return { ...s, enabledForPractice: targetState };
      })
    );
  };

  const updateSettings = (updates: Partial<UserSettings>) => {
    setUserSettings(prev => ({ ...prev, ...updates }));
  };

  const resetAllProgress = () => {
    const clean = clearStoredState();
    startTransition(() => {
      setSymbols(clean.symbols);
      setUserProgress(clean.userProgress);
      setUserSettings(clean.userSettings);
      setActiveLessonModal(null);
      setActivePracticeModal(null);
      setSelectedSymbolForDetail(null);
    });
  };

  const importState = (newState: AppStoredState) => {
    startTransition(() => {
      setSymbols(newState.symbols);
      setUserProgress(newState.userProgress);
      setUserSettings(newState.userSettings);
    });
  };

  return (
    <AppContext.Provider
      value={{
        symbols,
        userProgress,
        userSettings,
        activeTab,
        setActiveTab,
        activeLessonModal,
        startLesson,
        closeLessonModal,
        activePracticeModal,
        startPractice,
        closePracticeModal,
        recordAnswer,
        completeLessonSession,
        createCustomSymbol,
        updateCustomSymbol,
        deleteCustomSymbol,
        toggleSymbolEnabled,
        updateSettings,
        resetAllProgress,
        importState,
        selectedSymbolForDetail,
        setSelectedSymbolForDetail,
        recentAchievementUnlocked,
        dismissAchievement,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
