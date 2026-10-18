import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Clock,
  Flame,
  HelpCircle,
  Play,
  RotateCcw,
  Square,
  Volume2,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateExercise, getLearnedSymbols } from '../../lib/adaptive/adaptiveEngine';
import { morseAudio } from '../../lib/audio/morseAudio';
import { checkAnswer, isValidMorsePattern } from '../../lib/morse/morseUtils';
import { ExerciseType, GeneratedExercise, MorseSymbol } from '../../types/morse';
import { TelegraphKey } from '../telegraph/TelegraphKey';

interface PracticeSessionProps {
  exerciseType: ExerciseType;
  customOnly?: boolean;
  targetSymbolId?: string;
  onClose: () => void;
}

export const PracticeSession: React.FC<PracticeSessionProps> = ({
  exerciseType,
  customOnly = false,
  targetSymbolId,
  onClose,
}) => {
  const { symbols, recordAnswer, userSettings, userProgress } = useApp();

  // Filter pool: strictly symbols already learned by the user!
  const learnedSymbols = getLearnedSymbols(symbols, userProgress);

  let pool: MorseSymbol[] = [];
  if (targetSymbolId) {
    const single = symbols.find(s => s.id === targetSymbolId);
    pool = single ? [single] : learnedSymbols;
  } else if (customOnly) {
    const customList = symbols.filter(s => !s.isBuiltIn && s.enabledForPractice);
    pool = customList.length > 0 ? customList : learnedSymbols;
  } else {
    pool = learnedSymbols;
  }

  // Session State
  const [currentExercise, setCurrentExercise] = useState<GeneratedExercise | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [reverseMorseBuffer, setReverseMorseBuffer] = useState('');
  const [telegraphBuffer, setTelegraphBuffer] = useState('');

  // Evaluation
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);

  // Timed Blitz mode: 60 seconds
  const isTimedBlitz = exerciseType === 'timed_blitz';
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isTimeUp, setIsTimeUp] = useState(false);

  // Audio state
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const exerciseStartTimeRef = useRef(Date.now());

  // Setup timer for blitz
  useEffect(() => {
    if (!isTimedBlitz) return;
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsTimeUp(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimedBlitz]);

  // Load first exercise
  useEffect(() => {
    loadNext();
  }, []);

  const loadNext = () => {
    setIsAnswerChecked(false);
    setSelectedOption(null);
    setTextInput('');
    setReverseMorseBuffer('');
    setTelegraphBuffer('');
    exerciseStartTimeRef.current = Date.now();

    const actualType = isTimedBlitz
      ? (['char_to_morse', 'morse_to_char', 'multiple_choice'] as ExerciseType[])[
          Math.floor(Math.random() * 3)
        ]
      : exerciseType;

    try {
      const ex = generateExercise(
        pool,
        learnedSymbols,
        actualType,
        userSettings.practiceDifficulty
      );
      setCurrentExercise(ex);

      if (userSettings.autoPlayAudio && (actualType === 'audio_to_char' || actualType === 'listening_dictation' || actualType === 'audio_to_word')) {
        setTimeout(() => playAudio(ex), 300);
      }
    } catch (e) {
      console.error('Error generating exercise in practice session:', e);
    }
  };

  const playAudio = (exercise: GeneratedExercise) => {
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

  const handleCheck = (explicitResponse?: string) => {
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
        return;
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
    setQuestionCount(prev => prev + 1);

    if (correct) {
      setCorrectCount(prev => prev + 1);
      setStreak(prev => prev + 1);
      if (userSettings.soundEffects) {
        morseAudio.playSuccessSound(userSettings.volume);
      }
    } else {
      setStreak(0);
      if (userSettings.soundEffects) {
        morseAudio.playErrorSound(userSettings.volume);
      }
    }

    recordAnswer({
      symbolId: currentExercise.symbol.id,
      correct,
      responseTimeMs,
      exerciseType: currentExercise.type,
      userResponse,
    });
  };

  // Keyboard support for dots and dashes in reverse_production
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
          handleCheck(reverseMorseBuffer);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswerChecked, currentExercise, reverseMorseBuffer, userSettings.toneFrequency, userSettings.volume]);

  // Timed Blitz finished view
  if (isTimeUp) {
    const accuracy = questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md text-white">
        <div className="w-full max-w-md bg-[#070b08] border border-green-900/50 rounded-3xl p-6 md:p-8 text-center shadow-2xl">
          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 bg-green-950 border-2 border-green-500 shadow-[0_0_24px_rgba(34,197,94,0.4)]">
            <Clock className="w-10 h-10 text-green-400" />
          </div>

          <h3 className="text-2xl font-black mb-1 text-green-300">Time's Up!</h3>
          <p className="text-sm text-zinc-400 mb-6">60-Second Timed Blitz Sprint Finished</p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-black border border-green-950 rounded-2xl p-4">
              <span className="text-xs text-zinc-500 block mb-1">Correct Answers</span>
              <span className="text-3xl font-black text-green-400">{correctCount}</span>
            </div>
            <div className="bg-black border border-green-950 rounded-2xl p-4">
              <span className="text-xs text-zinc-500 block mb-1">Accuracy</span>
              <span className="text-3xl font-black text-green-300">{accuracy}%</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-green-500 hover:bg-green-400 font-black text-black text-base shadow-lg shadow-green-500/25 active:translate-y-0.5 transition-all cursor-pointer"
          >
            Complete Session
          </button>
        </div>
      </div>
    );
  }

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

        {/* Center: Title / Learned Indicator or Blitz Countdown */}
        <div className="flex items-center gap-2">
          {isTimedBlitz ? (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-950 border border-green-700/60 font-mono font-bold text-green-400">
              <Clock className="w-4 h-4 text-green-400 animate-pulse" />
              <span>{timeRemaining}s</span>
            </div>
          ) : (
            <div className="text-xs text-zinc-400 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
              <span>Practicing {learnedSymbols.length} Learned Symbols</span>
            </div>
          )}
        </div>

        {/* Streak counter */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-green-900/60 font-black text-green-400 text-sm shrink-0">
          <Flame className="w-4 h-4 text-green-400 fill-current" />
          <span>{streak}</span>
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
                  onClick={() => playAudio(currentExercise)}
                  className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all shadow-xl cursor-pointer ${
                    isPlayingAudio
                      ? 'bg-green-500 text-black scale-105 shadow-[0_0_24px_#22c55e] ring-4 ring-green-400/40'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-green-400 border border-green-700/60 shadow-lg active:scale-95'
                  }`}
                  aria-label="Play audio"
                >
                  {isPlayingAudio ? <Square className="w-8 h-8 fill-current" /> : <Volume2 className="w-8 h-8" />}
                </button>
                <span className="text-xs text-zinc-400 mt-2 font-mono">
                  {isPlayingAudio ? 'Transmitting...' : 'Tap to hear audio signal'}
                </span>
              </div>
            )}

            {/* Interactions */}
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
                    handleCheck(pattern);
                  }}
                />
              </div>
            )}

            {currentExercise.type === 'reverse_production' && (
              <div className="w-full max-w-md flex flex-col items-center">
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
                  Keyboard: Press <span className="text-green-400 font-bold">[ . ]</span> for Dot, <span className="text-green-300 font-bold">[ - ]</span> for Dash, <span className="text-zinc-300 font-bold">[Enter]</span> to Verify.
                </div>
              </div>
            )}

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
                    if (e.key === 'Enter') handleCheck();
                  }}
                  placeholder="Type character or word..."
                  className="w-full py-4 text-center rounded-2xl bg-black border-2 border-green-900/60 focus:border-green-400 text-3xl font-black text-green-300 placeholder-zinc-700 outline-none uppercase shadow-inner"
                />
              </div>
            )}

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
                        onClick={() => setSelectedOption(opt)}
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

      {/* Bottom Action Sheet */}
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
          {isAnswerChecked ? (
            <div className="flex items-center gap-3">
              {isCorrect ? (
                <CheckCircle2 className="w-9 h-9 text-green-400 shrink-0" />
              ) : (
                <XCircle className="w-9 h-9 text-red-400 shrink-0" />
              )}
              <div>
                <h4 className={`font-black text-lg ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
                  {isCorrect ? 'Correct! Signal Accepted.' : 'Incorrect Transmission'}
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

          {!isAnswerChecked ? (
            <button
              type="button"
              onClick={() => handleCheck()}
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
              onClick={loadNext}
              className={`px-8 py-3.5 rounded-2xl font-black text-base shadow-lg active:translate-y-0.5 transition-all cursor-pointer ${
                isCorrect
                  ? 'bg-green-500 hover:bg-green-400 text-black shadow-green-500/30'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-white'
              }`}
            >
              Next Exercise
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
