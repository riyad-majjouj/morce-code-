import React from 'react';
import {
  CheckCircle2,
  Clock,
  Ear,
  Headphones,
  Keyboard,
  ListCheck,
  Radio,
  RotateCcw,
  Sparkles,
  Terminal,
  Volume2,
  Wrench,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getLearnedSymbols } from '../lib/adaptive/adaptiveEngine';
import { ExerciseType } from '../types/morse';

export const PracticePage: React.FC = () => {
  const { symbols, startPractice, userProgress } = useApp();

  const learnedSymbols = getLearnedSymbols(symbols, userProgress);
  const customSymbolsCount = symbols.filter(s => !s.isBuiltIn && s.enabledForPractice).length;
  const weakSymbolsCount = learnedSymbols.filter(
    s => s.stats.attempts >= 2 && (s.stats.correct / s.stats.attempts < 0.75 || s.stats.state === 'reviewing')
  ).length;

  const practiceModes: Array<{
    type: ExerciseType;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    isTimed?: boolean;
    customOnly?: boolean;
    badge?: string;
  }> = [
    {
      type: 'char_to_morse',
      title: 'Character to Morse',
      description: 'See the learned letter and transmit or select its corresponding dot-dash pattern.',
      icon: Radio,
    },
    {
      type: 'morse_to_char',
      title: 'Morse to Character',
      description: 'Read the pulse pattern and identify which learned character it spells.',
      icon: Terminal,
    },
    {
      type: 'audio_to_char',
      title: 'Audio Listening Ear',
      description: 'Acoustic training without text hints. Identify learned symbols solely by sound rhythm.',
      icon: Headphones,
      badge: 'Ear Training',
    },
    {
      type: 'reverse_production',
      title: 'Reverse Code Builder',
      description: 'Construct Morse patterns pulse-by-pulse using the tactile Dot and Dash pad.',
      icon: Keyboard,
    },
    {
      type: 'manual_keying',
      title: 'Telegraph Key Studio',
      description: 'Transmit signals using the virtual telegraph key or Spacebar key.',
      icon: Radio,
      badge: 'Telegraph Key',
    },
    {
      type: 'multiple_choice',
      title: 'Rapid Recognition',
      description: 'Match symbols against plausible distractors to build rapid visual discrimination.',
      icon: ListCheck,
    },
    {
      type: 'listening_dictation',
      title: 'High-Speed Dictation',
      description: 'Transcribe incoming audio transmissions directly into the decoder.',
      icon: Ear,
    },
    {
      type: 'timed_blitz',
      title: '60-Second Timed Blitz',
      description: 'Race against the clock! Answer as many questions as possible in one minute.',
      icon: Clock,
      isTimed: true,
      badge: '60s Sprint',
    },
    {
      type: 'custom_practice',
      title: 'Custom Symbols Drill',
      description: 'Practice exclusively with user-created symbols and custom codes.',
      icon: Wrench,
      customOnly: true,
      badge: `${customSymbolsCount} Custom`,
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8 text-white">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-green-300">Targeted Practice Arena</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Practice exercises strictly adapt to the symbols you have unlocked in your curriculum.
        </p>
      </div>

      {/* Learned Symbols Active Scope Banner */}
      <div className="rounded-3xl bg-[#070d08] border border-green-900/60 p-5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
            <span className="text-xs uppercase tracking-wider font-bold text-green-400">
              Active Learned Pool: {learnedSymbols.length} Symbols
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Practice questions only test symbols you have already completed or practiced.
          </p>

          {/* Quick symbol pill roll */}
          <div className="flex items-center gap-1.5 flex-wrap mt-3">
            {learnedSymbols.slice(0, 16).map(s => (
              <span
                key={s.id}
                className="px-2 py-0.5 rounded-md bg-black border border-green-950 font-mono text-xs font-bold text-green-300"
              >
                {s.char}
              </span>
            ))}
            {learnedSymbols.length > 16 && (
              <span className="text-xs text-zinc-500 font-mono">
                +{learnedSymbols.length - 16} more
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => startPractice('manual_keying')}
          className="px-5 py-3 rounded-2xl bg-green-500 hover:bg-green-400 text-black font-bold text-xs uppercase tracking-wider shadow-lg shadow-green-500/20 active:translate-y-0.5 transition-all shrink-0 cursor-pointer"
        >
          Quick Telegraph Drill
        </button>
      </div>

      {/* Weak Symbols Review Banner */}
      {weakSymbolsCount > 0 && (
        <div className="rounded-2xl bg-[#110e06] border border-green-800/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-950 text-green-400 flex items-center justify-center shrink-0 border border-green-800/50">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                Adaptive Review: {weakSymbolsCount} learned symbols need practice
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Our algorithm detected symbols with recent errors or decaying mastery.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => startPractice('char_to_morse')}
            className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 font-bold text-xs text-black active:translate-y-0.5 transition-all whitespace-nowrap cursor-pointer shadow-md"
          >
            Review Weak Symbols
          </button>
        </div>
      )}

      {/* Practice Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {practiceModes.map((mode, i) => {
          const Icon = mode.icon;
          const isCustomDisabled = mode.customOnly && customSymbolsCount === 0;

          return (
            <div
              key={i}
              className={`group relative rounded-3xl bg-[#070b08] border border-green-950 hover:border-green-800/60 p-6 flex flex-col justify-between transition-all shadow-xl hover:shadow-[0_0_24px_rgba(34,197,94,0.15)] ${
                isCustomDisabled ? 'opacity-50' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-black border border-green-900/60 flex items-center justify-center text-green-400 shadow-md group-hover:border-green-500 transition-colors">
                    <Icon className="w-6 h-6" />
                  </div>
                  {mode.badge && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 text-green-400 border border-green-900/40">
                      {mode.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-bold text-zinc-100 group-hover:text-green-300 transition-colors">
                  {mode.title}
                </h3>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  {mode.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-green-950">
                <button
                  type="button"
                  disabled={isCustomDisabled}
                  onClick={() => startPractice(mode.type, { customOnly: mode.customOnly })}
                  className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:translate-y-0.5 text-xs font-bold text-green-400 hover:text-white border border-green-900/50 hover:border-green-600 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Sparkles className="w-3.5 h-3.5 text-green-400" />
                  <span>{isCustomDisabled ? 'Create Custom Symbols First' : 'Start Practice'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
