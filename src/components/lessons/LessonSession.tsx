import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  ChevronRight,
  Flame,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Volume2,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateExercise } from '../../lib/adaptive/adaptiveEngine';
import { morseAudio } from '../../lib/audio/morseAudio';
import { checkAnswer, isValidMorsePattern } from '../../lib/morse/morseUtils';
import { ExerciseType, GeneratedExercise, LessonConfig, MorseSymbol } from '../../types/morse';
import { TelegraphKey } from '../telegraph/TelegraphKey';

interface LessonSessionProps {
  lesson: LessonConfig;
  onClose: () => void;
}

export const LessonSession: React.FC<LessonSessionProps> = ({ lesson, onClose }) => {
  const { symbols, recordAnswer, completeLessonSession, userSettings } = useApp();

  // Filter target and review symbols
  const targetSymbols = symbols.filter(s => lesson.targetSymbolIds.includes(s.id));
  const reviewSymbols = symbols.filter(s => lesson.reviewSymbolIds.includes(s.id));
  const combinedPool = [...targetSymbols, ...reviewSymbols];
  const eligiblePool = combinedPool.length > 0 ? combinedPool : targetSymbols;

  // Introduction phase for new lessons
  const [inIntro, setInIntro] = useState(true);
  const [introIndex, setIntroIndex] = useState(0);

  // Exercise State
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [totalQuestions] = useState(lesson.totalExercises || 8);
  const [currentExercise, setCurrentExercise] = useState<GeneratedExercise | null>(null);

  // User input
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [reverseMorseBuffer, setReverseMorseBuffer] = useState('');
  const [telegraphBuffer, setTelegraphBuffer] = useState('');

  // Evaluation & Feedback
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streakCombo, setStreakCombo] = useState(0);
  const [scoreCount, setScoreCount] = useState(0);
  const [isLessonFinished, setIsLessonFinished] = useState(false);

  // Audio state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const exerciseStartTimeRef = useRef(Date.now());

  // Setup first exercise
  useEffect(() => {
    if (!inIntro && !currentExercise) {
      loadNextExercise();
    }
  }, [inIntro]);

  const loadNextExercise = () => {
    setIsAnswerChecked(false);
    setSelectedOption(null);
    setTextInput('');
    setReverseMorseBuffer('');
    setTelegraphBuffer('');
    exerciseStartTimeRef.current = Date.now();

    try {
      const ex = generateExercise(
        targetSymbols.length > 0 ? targetSymbols : eligiblePool,
        symbols.filter(s => s.enabledForPractice),
        undefined,
        userSettings.practiceDifficulty
      );
      setCurrentExercise(ex);

      // Auto-play audio if enabled
      if (userSettings.autoPlayAudio && (ex.audioOnly || ex.type === 'audio_to_char' || ex.type === 'audio_to_word' || ex.type === 'listening_dictation')) {
        setTimeout(() => {
          playExerciseAudio(ex);
        }, 300);
      }
    } catch (e) {
      console.error('Error generating exercise', e);
    }
  };

  const playExerciseAudio = (exercise: GeneratedExercise) => {
    if (isPlayingAudio) {
      morseAudio.stopSequence();
      setIsPlayingAudio(false);
      return;
    }
    setIsPlayingAudio(true);
    morseAudio.playSequence(exercise.expectedMorse, {
      frequency: userSettings.toneFrequency,
      wpm: userSettings.wpm,
      volume: userSettings.volume,
      onComplete: () => setIsPlayingAudio(false),
    });
  };

  const handleOptionSelect = (option: string) => {
    if (isAnswerChecked) return;
    setSelectedOption(option);
  };

  const handleCheckAnswer = (explicitResponse?: string) => {
    if (!currentExercise || isAnswerChecked) return;

    const responseTimeMs = Date.now() - exerciseStartTimeRef.current;
    let userResponse = explicitResponse !== undefined && explicitResponse !== '' ? explicitResponse : '';

    if (!userResponse) {
      if (telegraphBuffer.trim().length > 0) {
        userResponse = telegraphBuffer.trim();
      } else if (reverseMorseBuffer.trim().length > 0) {
        userResponse = reverseMorseBuffer.trim();
      } else if (textInput.trim().length > 0) {
        userResponse = textInput.trim();
      } else if (selectedOption !== null) {
        userResponse = selectedOption;
      } else {
        return; // nothing submitted yet
      }
    }

    const expected =
      currentExercise.type === 'char_to_morse' ||
      currentExercise.type === 'multiple_choice' ||
      currentExercise.type === 'reverse_production' ||
      currentExercise.type === 'manual_keying' ||
      currentExercise.type === 'word_encoding'
        ? currentExercise.expectedMorse
        : currentExercise.expectedChar;

    const correct = checkAnswer(expected, userResponse, currentExercise.symbol, symbols);
    setIsCorrect(correct);
    setIsAnswerChecked(true);

    if (correct) {
      setScoreCount(prev => prev + 1);
      setStreakCombo(prev => prev + 1);
      if (userSettings.soundEffects) {
        morseAudio.playSuccessSound(userSettings.volume);
      }
    } else {
      setStreakCombo(0);
      if (userSettings.soundEffects) {
        morseAudio.playErrorSound(userSettings.volume);
      }
    }

    // Record answer in global state
    recordAnswer({
      symbolId: currentExercise.symbol.id,
      correct,
      responseTimeMs,
      exerciseType: currentExercise.type,
      userResponse,
    });
  };

  // Keyboard shortcut listener for reverse_production exercises (allowing ., -, Backspace, Enter)
  useEffect(() => {
    if (isAnswerChecked || !currentExercise || currentExercise.type !== 'reverse_production') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.key === '.' || e.code === 'Period' || e.key === 'd') && !e.repeat) {
        e.preventDefault();
        setReverseMorseBuffer(p => p + '.');
        morseAudio.playTone(userSettings.toneFrequency, 80, userSettings.volume);
      } else if ((e.key === '-' || e.code === 'Minus' || e.key === '_' || e.key === 'f') && !e.repeat) {
        e.preventDefault();
        setReverseMorseBuffer(p => p + '-');
        morseAudio.playTone(userSettings.toneFrequency, 240, userSettings.volume);
      } else if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setReverseMorseBuffer(p => p + ' ');
      } else if (e.code === 'Backspace') {
        e.preventDefault();
        setReverseMorseBuffer(p => p.slice(0, -1));
      } else if (e.code === 'Enter') {
        e.preventDefault();
        if (reverseMorseBuffer.length > 0) {
          handleCheckAnswer(reverseMorseBuffer);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswerChecked, currentExercise, reverseMorseBuffer, userSettings.toneFrequency, userSettings.volume]);

  const handleContinueAfterFeedback = () => {
    const nextIdx = currentExerciseIndex + 1;
    if (nextIdx >= totalQuestions) {
      finishLesson();
    } else {
      setCurrentExerciseIndex(nextIdx);
      loadNextExercise();
    }
  };

  const finishLesson = () => {
    setIsLessonFinished(true);
    const finalScore = Math.round((scoreCount / totalQuestions) * 100);
    const earnedXp = lesson.xpReward + (finalScore >= 90 ? 20 : 0);

    completeLessonSession({
      lessonId: lesson.id,
      score: finalScore,
      xpEarned: earnedXp,
    });

    if (finalScore >= 80) {
      confetti({
        particleCount: 100,
        spread: 80,
        colors: ['#22c55e', '#4ade80', '#10b981', '#ffffff'],
        origin: { y: 0.6 },
      });
      if (userSettings.soundEffects) {
        morseAudio.playFanfareSound(userSettings.volume);
      }
    }
  };

  // --- Intro View for New Symbols ---
  if (inIntro && targetSymbols.length > 0) {
    const currentIntroSymbol = targetSymbols[introIndex];
    const isLastIntro = introIndex >= targetSymbols.length - 1;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
        <div className="relative w-full max-w-lg bg-[#070b08] border border-green-900/50 rounded-3xl p-6 md:p-8 shadow-2xl text-white">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-6">
            <span className="px-3 py-1 rounded-full bg-green-950 text-green-400 text-xs font-bold border border-green-800/60 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-green-400" />
              New Symbol Introduced
            </span>
            <span className="text-xs text-zinc-500">
              {introIndex + 1} of {targetSymbols.length}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center text-center my-6">
            <div className="w-28 h-28 rounded-3xl bg-black border-2 border-green-600/60 shadow-[0_0_24px_rgba(34,197,94,0.3)] flex items-center justify-center text-6xl font-black text-green-400 mb-6">
              {currentIntroSymbol.char}
            </div>

            <div className="flex items-center gap-3 mb-6">
              {currentIntroSymbol.morse.split('').map((pulse, idx) => (
                <div
                  key={idx}
                  className={`transition-all ${
                    pulse === '.'
                      ? 'w-6 h-6 rounded-full bg-green-400 shadow-[0_0_12px_#4ade80]'
                      : 'w-14 h-5 rounded-full bg-green-500 shadow-[0_0_12px_#22c55e]'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={() => {
                morseAudio.playSequence(currentIntroSymbol.morse, {
                  frequency: userSettings.toneFrequency,
                  wpm: userSettings.wpm,
                  volume: userSettings.volume,
                });
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-green-800/60 text-green-400 hover:text-white font-semibold text-sm transition-all mb-4 active:scale-95 cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-green-400" />
              Listen to Audio Transmission
            </button>

            {currentIntroSymbol.description && (
              <p className="text-sm text-zinc-300 max-w-sm font-medium">
                {currentIntroSymbol.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-green-950 mt-6">
            <button
              onClick={() => setInIntro(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300 font-semibold"
            >
              Skip Intro
            </button>

            <button
              onClick={() => {
                if (isLastIntro) {
                  setInIntro(false);
                } else {
                  setIntroIndex(prev => prev + 1);
                }
              }}
              className="px-6 py-3 rounded-2xl bg-green-500 hover:bg-green-400 font-bold text-black text-sm flex items-center gap-2 shadow-lg shadow-green-500/25 active:translate-y-0.5 transition-all cursor-pointer"
            >
              <span>{isLastIntro ? 'Start Exercises' : 'Next Symbol'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Final Celebration Screen ---
  if (isLessonFinished) {
    const finalScore = Math.round((scoreCount / totalQuestions) * 100);
    const passed = finalScore >= (lesson.minPassingScore || 80);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
        <div className="relative w-full max-w-md bg-[#070b08] border border-green-900/50 rounded-3xl p-6 md:p-8 shadow-2xl text-white text-center">
          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-5 bg-green-950 border-2 border-green-500 shadow-[0_0_24px_rgba(34,197,94,0.4)]">
            {passed ? (
              <Zap className="w-10 h-10 text-green-400" />
            ) : (
              <RotateCcw className="w-10 h-10 text-zinc-400" />
            )}
          </div>

          <h2 className="text-2xl font-black mb-2 text-green-300">
            {passed ? 'Lesson Mastered!' : 'Keep Practicing'}
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            {passed
              ? `Outstanding performance on ${lesson.title}. Next lesson is unlocked!`
              : `You scored ${finalScore}%. You need ${lesson.minPassingScore || 80}% to advance.`}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-black border border-green-950 rounded-2xl p-4">
              <span className="text-xs text-zinc-500 block mb-1">Score</span>
              <span className="text-2xl font-black text-green-400">{finalScore}%</span>
            </div>
            <div className="bg-black border border-green-950 rounded-2xl p-4">
              <span className="text-xs text-zinc-500 block mb-1">XP Earned</span>
              <span className="text-2xl font-black text-green-300">+{lesson.xpReward}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-green-500 hover:bg-green-400 font-bold text-black text-base shadow-lg shadow-green-500/25 active:translate-y-0.5 transition-all cursor-pointer"
            >
              Back to Roadmap
            </button>

            {!passed && (
              <button
                onClick={() => {
                  setIsLessonFinished(false);
                  setCurrentExerciseIndex(0);
                  setScoreCount(0);
                  setStreakCombo(0);
                  loadNextExercise();
                }}
                className="w-full py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-sm border border-zinc-800 transition-all cursor-pointer"
              >
                Retry Lesson
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Active Exercise Runner ---
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black text-white">
      {/* Top Header Bar */}
      <div className="w-full border-b border-green-950/60 bg-[#050805] px-4 py-3.5 flex items-center justify-between gap-4">
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Progress Bar */}
        <div className="flex-1 max-w-xl mx-2">
          <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden border border-green-950">
            <div
              className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-300 rounded-full shadow-[0_0_8px_#22c55e]"
              style={{ width: `${((currentExerciseIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Streak Combo Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-green-900/60 font-black text-green-400 text-sm shrink-0">
          <Flame className="w-4 h-4 text-green-400 fill-current" />
          <span>{streakCombo}</span>
        </div>
      </div>

      {/* Main Exercise Arena with non-clipping scroll layout */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto overscroll-contain">
        <div className="w-full max-w-2xl mx-auto min-h-full flex flex-col items-center justify-start px-4 py-4 md:py-6">
          {currentExercise && (
            <div className="w-full flex flex-col items-center text-center">
              {/* Exercise Title / Instructions Card - Always visible at top */}
              <div className="sticky top-0 z-20 w-full max-w-xl mx-auto mb-5 bg-[#071309]/95 backdrop-blur-md border-2 border-green-600/70 rounded-2xl p-4 md:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.85)] text-center shrink-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-950/90 border border-green-700/60 text-green-400 text-xs font-mono font-bold tracking-wider mb-2 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span>نص التمرين • Exercise Prompt</span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-white leading-snug tracking-tight">
                  {currentExercise.prompt}
                </h3>
                {currentExercise.subPrompt && (
                  <p className="text-xs md:text-sm text-green-300/90 mt-2 font-medium">
                    {currentExercise.subPrompt}
                  </p>
                )}
              </div>

            {/* Audio Playback Center for Audio Exercises */}
            {(currentExercise.audioOnly ||
              currentExercise.type === 'audio_to_char' ||
              currentExercise.type === 'audio_to_word' ||
              currentExercise.type === 'listening_dictation') && (
              <div className="mb-6 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => playExerciseAudio(currentExercise)}
                  className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all shadow-xl cursor-pointer ${
                    isPlayingAudio
                      ? 'bg-green-500 text-black scale-105 shadow-[0_0_24px_#22c55e] ring-4 ring-green-400/40'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-green-400 border border-green-700/60 shadow-lg active:scale-95'
                  }`}
                  aria-label="Play Morse audio"
                >
                  {isPlayingAudio ? (
                    <Square className="w-8 h-8 fill-current" />
                  ) : (
                    <Volume2 className="w-8 h-8" />
                  )}
                </button>
                <span className="text-xs text-zinc-400 mt-2 font-mono">
                  {isPlayingAudio ? 'Transmitting...' : 'Tap to hear audio signal'}
                </span>
              </div>
            )}

            {/* Exercise Interaction Components */}
            {/* 1. Manual Keying or Word Encoding Mode (Telegraph Key + Spacebar + Dot/Dash) */}
            {(currentExercise.type === 'manual_keying' || currentExercise.type === 'word_encoding') && (
              <div className="w-full">
                <TelegraphKey
                  disabled={isAnswerChecked}
                  allowSpaceSeparator={true}
                  onBufferChange={buf => {
                    setTelegraphBuffer(buf);
                    setTextInput(buf);
                  }}
                  onPatternSubmit={pattern => {
                    setTelegraphBuffer(pattern);
                    setTextInput(pattern);
                    handleCheckAnswer(pattern);
                  }}
                />
              </div>
            )}

            {/* 2. Reverse Production: Dot and Dash Button Pad */}
            {currentExercise.type === 'reverse_production' && (
              <div className="w-full max-w-md flex flex-col items-center">
                {/* Visual buffer */}
                <div className="w-full min-h-[64px] bg-black border-2 border-green-950 rounded-2xl flex items-center justify-center p-3 mb-4 shadow-inner">
                  {reverseMorseBuffer.length === 0 ? (
                    <span className="text-zinc-600 text-sm font-mono italic">
                      Tap buttons or press [ . ] and [ - ] on keyboard...
                    </span>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      {reverseMorseBuffer.split('').map((pulse, i) => (
                        <span
                          key={i}
                          className={`inline-block ${
                            pulse === '.'
                              ? 'w-5 h-5 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]'
                              : pulse === '-'
                              ? 'w-12 h-4 rounded-full bg-green-400 shadow-[0_0_10px_#4ade80]'
                              : 'w-4 h-6 text-zinc-500 font-mono text-center'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Tactile Buttons for Dot, Dash, Backspace */}
                <div className="grid grid-cols-3 gap-3 w-full">
                  <button
                    type="button"
                    disabled={isAnswerChecked}
                    onClick={() => {
                      setReverseMorseBuffer(p => p + '.');
                      morseAudio.playTone(userSettings.toneFrequency, 80, userSettings.volume);
                    }}
                    className="py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border-2 border-green-900/60 active:translate-y-1 transition-all flex flex-col items-center justify-center cursor-pointer shadow-md"
                  >
                    <span className="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e] mb-1" />
                    <span className="text-xs font-bold text-green-400">Dot ( . )</span>
                  </button>

                  <button
                    type="button"
                    disabled={isAnswerChecked}
                    onClick={() => {
                      setReverseMorseBuffer(p => p + '-');
                      morseAudio.playTone(userSettings.toneFrequency, 240, userSettings.volume);
                    }}
                    className="py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border-2 border-green-900/60 active:translate-y-1 transition-all flex flex-col items-center justify-center cursor-pointer shadow-md"
                  >
                    <span className="w-10 h-3 rounded-full bg-green-400 shadow-[0_0_8px_#4ade80] mb-1" />
                    <span className="text-xs font-bold text-green-300">Dash ( - )</span>
                  </button>

                  <button
                    type="button"
                    disabled={isAnswerChecked || reverseMorseBuffer.length === 0}
                    onClick={() => setReverseMorseBuffer(p => p.slice(0, -1))}
                    className="py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 active:translate-y-1 transition-all flex flex-col items-center justify-center text-zinc-400 disabled:opacity-30"
                  >
                    <span className="text-base mb-0.5">⌫</span>
                    <span className="text-xs font-bold">Delete</span>
                  </button>
                </div>

                <div className="text-[11px] text-zinc-500 mt-3 font-medium">
                  Keyboard: Press <span className="text-green-400 font-bold">[ . ]</span> for Dot, <span className="text-green-300 font-bold">[ - ]</span> for Dash, <span className="text-zinc-300 font-bold">[Enter]</span> to Check.
                </div>
              </div>
            )}

            {/* 3. Dictation / Typing Input (Listening Dictation, Word Decoding, Audio Word) */}
            {(currentExercise.type === 'listening_dictation' ||
              currentExercise.type === 'word_decoding' ||
              currentExercise.type === 'audio_to_word') && (
              <div className="w-full max-w-sm">
                <input
                  type="text"
                  autoFocus
                  disabled={isAnswerChecked}
                  value={textInput}
                  onChange={e => setTextInput(e.target.value.toUpperCase())}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCheckAnswer();
                  }}
                  placeholder="Type decoded word or character..."
                  className="w-full py-4 text-center rounded-2xl bg-black border-2 border-green-900/60 focus:border-green-400 text-3xl font-black text-green-300 placeholder-zinc-700 outline-none uppercase shadow-inner"
                />
              </div>
            )}

            {/* 4. Multiple Choice Grid */}
            {currentExercise.options &&
              currentExercise.type !== 'manual_keying' &&
              currentExercise.type !== 'word_encoding' &&
              currentExercise.type !== 'reverse_production' &&
              currentExercise.type !== 'listening_dictation' &&
              currentExercise.type !== 'word_decoding' &&
              currentExercise.type !== 'audio_to_word' && (
                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                  {currentExercise.options.map((opt, i) => {
                    const isSelected = selectedOption === opt;
                    const isDotDash = isValidMorsePattern(opt);

                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={isAnswerChecked}
                        onClick={() => handleOptionSelect(opt)}
                        className={`min-h-[76px] p-4 rounded-2xl border-2 font-bold transition-all text-xl flex items-center justify-center cursor-pointer shadow-md active:translate-y-0.5 ${
                          isSelected
                            ? 'bg-green-950/80 border-green-400 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)] ring-2 ring-green-400/50'
                            : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800 hover:border-green-900/60 text-zinc-200'
                        }`}
                      >
                        {isDotDash ? (
                          <div className="flex items-center gap-1.5">
                            {opt.split('').map((pulse, pIdx) => (
                              <span
                                key={pIdx}
                                className={`inline-block ${
                                  pulse === '.'
                                    ? 'w-3 h-3 rounded-full bg-green-400'
                                    : 'w-7 h-2 rounded-full bg-green-500'
                                }`}
                              />
                            ))}
                          </div>
                        ) : (
                          <span>{opt}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
          </div>
        )}
        </div>
      </div>

      {/* Bottom Action / Feedback Sheet */}
      <div
        className={`w-full border-t transition-all duration-300 py-4 md:py-6 px-4 shrink-0 z-30 ${
          !isAnswerChecked
            ? 'bg-[#050805] border-green-950'
            : isCorrect
            ? 'bg-[#07170c] border-green-600/50'
            : 'bg-[#180909] border-red-900/50'
        }`}
      >
        <div className="w-full max-w-2xl mx-auto flex items-center justify-between gap-4">
          {/* Feedback message when checked */}
          {isAnswerChecked ? (
            <div className="flex items-center gap-3">
              {isCorrect ? (
                <CheckCircle2 className="w-9 h-9 text-green-400 shrink-0" />
              ) : (
                <XCircle className="w-9 h-9 text-red-400 shrink-0" />
              )}
              <div>
                <h4 className={`font-black text-lg ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                  {isCorrect ? 'Correct! Signal Verified.' : 'Incorrect Transmission'}
                </h4>
                {!isCorrect && currentExercise && (
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Expected answer:{' '}
                    <span className="font-bold underline text-white font-mono">
                      {currentExercise.type === 'char_to_morse' ||
                      currentExercise.type === 'reverse_production' ||
                      currentExercise.type === 'manual_keying' ||
                      currentExercise.type === 'word_encoding'
                        ? currentExercise.expectedMorse
                        : currentExercise.expectedChar}
                    </span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-xs text-zinc-500 hidden sm:block font-mono">
              Key pattern or choose response, then confirm.
            </div>
          )}

          {/* Action Button */}
          {!isAnswerChecked ? (
            <button
              type="button"
              onClick={() => handleCheckAnswer()}
              disabled={
                selectedOption === null &&
                textInput.trim().length === 0 &&
                reverseMorseBuffer.length === 0 &&
                telegraphBuffer.length === 0
              }
              className="px-8 py-3.5 rounded-2xl bg-green-500 hover:bg-green-400 font-black text-black text-base shadow-lg shadow-green-500/25 disabled:opacity-30 disabled:pointer-events-none active:translate-y-0.5 transition-all cursor-pointer"
            >
              Check Answer
            </button>
          ) : (
            <button
              type="button"
              onClick={handleContinueAfterFeedback}
              className={`px-8 py-3.5 rounded-2xl font-black text-base shadow-lg active:translate-y-0.5 transition-all cursor-pointer ${
                isCorrect
                  ? 'bg-green-500 hover:bg-green-400 text-black shadow-green-500/30'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-white'
              }`}
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
