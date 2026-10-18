import React, { useState } from 'react';
import {
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  Flame,
  HelpCircle,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { SymbolDetailModal } from '../components/symbols/SymbolDetailModal';
import { useApp } from '../context/AppContext';
import { ACHIEVEMENTS } from '../data/achievements';
import { ExerciseType, MorseSymbol } from '../types/morse';

export const StatsPage: React.FC = () => {
  const {
    symbols,
    userProgress,
    setSelectedSymbolForDetail,
    selectedSymbolForDetail,
    startPractice,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'heatmap' | 'achievements'>('overview');

  // Compute stats
  const totalAttempts = symbols.reduce((acc, s) => acc + s.stats.attempts, 0);
  const totalCorrect = symbols.reduce((acc, s) => acc + s.stats.correct, 0);
  const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const masteredCount = symbols.filter(s => s.stats.state === 'mastered').length;
  const learningCount = symbols.filter(s => s.stats.state === 'learning').length;
  const reviewDueCount = symbols.filter(s => s.stats.state === 'reviewing').length;

  const totalTimeMin = Math.round(userProgress.totalPracticeTimeSec / 60);

  // Most frequently missed symbols (min 2 attempts, sorted by error rate)
  const missedSymbols = symbols
    .filter(s => s.stats.attempts >= 2 && s.stats.incorrect > 0)
    .sort((a, b) => b.stats.incorrect / b.stats.attempts - a.stats.incorrect / a.stats.attempts)
    .slice(0, 5);

  // Review-due symbols
  const reviewDueSymbols = symbols
    .filter(s => s.stats.state === 'reviewing' || (s.stats.attempts >= 3 && s.stats.masteryScore < 60))
    .slice(0, 5);

  const formatExerciseName = (type: string) => {
    return type
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-8 text-white">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-black text-green-300">Learning Science & Statistics</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Real-time metrics, mastery retention heatmaps, and achievement badges derived from your practice history.
        </p>
      </div>

      {/* Top 4 Key Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-3xl bg-[#070b08] border border-green-950 p-5 shadow-lg">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase mb-1">
            <Target className="w-4 h-4 text-green-400" />
            <span>Overall Accuracy</span>
          </div>
          <div className="text-3xl font-black text-white">
            {overallAccuracy}%
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">
            {totalCorrect} / {totalAttempts} answers
          </div>
        </div>

        <div className="rounded-3xl bg-[#070b08] border border-green-950 p-5 shadow-lg">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase mb-1">
            <Flame className="w-4 h-4 text-green-400 fill-green-400" />
            <span>Practice Streak</span>
          </div>
          <div className="text-3xl font-black text-green-400">
            {userProgress.streak} <span className="text-sm font-semibold text-zinc-400">days</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            Active daily streak
          </div>
        </div>

        <div className="rounded-3xl bg-[#070b08] border border-green-950 p-5 shadow-lg">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase mb-1">
            <Clock className="w-4 h-4 text-green-400" />
            <span>Practice Time</span>
          </div>
          <div className="text-3xl font-black text-white">
            {totalTimeMin} <span className="text-sm font-semibold text-zinc-400">min</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">
            {userProgress.totalPracticeTimeSec}s total
          </div>
        </div>

        <div className="rounded-3xl bg-[#070b08] border border-green-950 p-5 shadow-lg">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase mb-1">
            <Award className="w-4 h-4 text-green-400" />
            <span>Mastered</span>
          </div>
          <div className="text-3xl font-black text-green-400">
            {masteredCount}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {learningCount} learning, {reviewDueCount} review
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-green-950 pb-2">
        {[
          { id: 'overview', label: 'Overview & Diagnostics' },
          { id: 'heatmap', label: 'Mastery Heatmap' },
          { id: 'achievements', label: `Achievements (${Object.values(userProgress.achievements).filter(a => a.unlocked).length}/${ACHIEVEMENTS.length})` },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-green-950 text-green-300 border border-green-600/70 shadow-sm shadow-green-600/25'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-950'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Missed Symbols Diagnostic */}
          <div className="rounded-3xl bg-[#070b08] border border-green-950 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              Highest Error Rate Symbols
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Symbols with the most frequent misidentifications. Click any card to drill down or practice.
            </p>

            {missedSymbols.length === 0 ? (
              <div className="text-xs text-zinc-500 italic p-4 bg-black rounded-2xl border border-green-950 text-center">
                No high-error symbols detected! Complete more exercises to populate diagnostics.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {missedSymbols.map(sym => {
                  const errorPct = Math.round((sym.stats.incorrect / sym.stats.attempts) * 100);

                  return (
                    <div
                      key={sym.id}
                      onClick={() => setSelectedSymbolForDetail(sym)}
                      className="p-4 rounded-2xl bg-black border border-green-950 hover:border-green-600 transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-black text-white">{sym.char}</span>
                        <span className="text-xs font-mono font-bold text-green-400">{sym.morse}</span>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                          <span>Error Rate</span>
                          <span className="text-green-400 font-bold">{errorPct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${errorPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Exercise Types Performance Table */}
          <div className="rounded-3xl bg-[#070b08] border border-green-950 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4">
              Modality Breakdown (Exercise Types)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(userProgress.exerciseTypeStats).map(([type, stats]) => {
                const acc = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 0;

                return (
                  <div key={type} className="p-3.5 rounded-2xl bg-black border border-green-950 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200">{formatExerciseName(type)}</h4>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {stats.correct} / {stats.attempts} correct
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-green-400">{acc}%</span>
                      <div className="w-12 h-1 bg-zinc-900 rounded-full overflow-hidden mt-1">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${acc}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Mastery Heatmap */}
      {activeTab === 'heatmap' && (
        <div className="rounded-3xl bg-[#070b08] border border-green-950 p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Full Alphabet & Symbol Mastery Heatmap</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Visualizes the retention decay and accuracy score (0-100) for every symbol in your library.
            </p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5">
            {symbols.map(sym => {
              const score = sym.stats.masteryScore;
              let bg = 'bg-zinc-950 border-zinc-900 text-zinc-600';
              if (sym.stats.attempts > 0) {
                if (score >= 85) bg = 'bg-green-500 border-green-400 text-black shadow-[0_0_10px_#22c55e] font-black';
                else if (score >= 60) bg = 'bg-green-900/80 border-green-600 text-green-300';
                else if (score >= 30) bg = 'bg-green-950 border-green-800 text-green-400';
                else bg = 'bg-zinc-900 border-green-950 text-green-600';
              }

              return (
                <button
                  key={sym.id}
                  type="button"
                  onClick={() => setSelectedSymbolForDetail(sym)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer hover:scale-105 active:scale-95 flex flex-col items-center justify-center ${bg}`}
                >
                  <span className="text-lg font-black leading-none">{sym.char}</span>
                  <span className="text-[10px] font-mono mt-1 opacity-80">{sym.morse}</span>
                  <span className="text-[9px] font-mono font-bold mt-1 opacity-70">{score}%</span>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-zinc-400 pt-4 border-t border-green-950 flex-wrap">
            <span className="font-bold">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-zinc-950 border border-zinc-800" />
              <span>Untested (0%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-green-950 border border-green-800" />
              <span>Learning (1-59%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-green-900/80 border border-green-600" />
              <span>Proficient (60-84%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-green-500 shadow-[0_0_6px_#22c55e]" />
              <span className="text-green-300 font-bold">Mastered (85%+)</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Achievements */}
      {activeTab === 'achievements' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {ACHIEVEMENTS.map(ach => {
            const isUnlocked = Boolean(userProgress.achievements[ach.id]?.unlocked);

            return (
              <div
                key={ach.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                  isUnlocked
                    ? 'bg-[#070d08] border-green-600/70 shadow-[0_0_15px_rgba(34,197,94,0.15)] text-white'
                    : 'bg-black/60 border-zinc-900 text-zinc-600 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        isUnlocked ? 'bg-green-500 text-black shadow-[0_0_12px_#22c55e]' : 'bg-zinc-900 text-zinc-600'
                      }`}
                    >
                      <Trophy className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold font-mono uppercase px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-800">
                      {isUnlocked ? 'Unlocked' : 'Locked'}
                    </span>
                  </div>

                  <h4 className={`text-base font-bold ${isUnlocked ? 'text-green-300' : 'text-zinc-400'}`}>
                    {ach.title}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    {ach.description}
                  </p>
                </div>

                {isUnlocked && (
                  <div className="mt-4 pt-3 border-t border-green-950 text-[10px] font-mono text-green-400">
                    Badge Earned
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Symbol Detail Modal */}
      {selectedSymbolForDetail && (
        <SymbolDetailModal
          symbol={selectedSymbolForDetail}
          onClose={() => setSelectedSymbolForDetail(null)}
          onEdit={() => setSelectedSymbolForDetail(null)}
        />
      )}
    </div>
  );
};
