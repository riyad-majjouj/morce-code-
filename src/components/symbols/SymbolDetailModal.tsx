import React, { useState } from 'react';
import { Award, Clock, Edit2, Play, Square, Target, X, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { morseAudio } from '../../lib/audio/morseAudio';
import { MorseSymbol } from '../../types/morse';

interface SymbolDetailModalProps {
  symbol: MorseSymbol | null;
  onClose: () => void;
  onEdit?: () => void;
}

export const SymbolDetailModal: React.FC<SymbolDetailModalProps> = ({
  symbol,
  onClose,
  onEdit,
}) => {
  const { userSettings, startPractice } = useApp();
  const [isPlaying, setIsPlaying] = useState(false);

  if (!symbol) return null;

  const stats = symbol.stats;
  const accuracy = stats.attempts > 0 ? Math.round((stats.correct / stats.attempts) * 100) : 0;

  const handlePlayAudio = () => {
    setIsPlaying(true);
    morseAudio.playSequence(symbol.morse, {
      frequency: userSettings.toneFrequency,
      wpm: userSettings.wpm,
      volume: userSettings.volume,
      onComplete: () => setIsPlaying(false),
    });
  };

  const handleStopAudio = () => {
    morseAudio.stopSequence();
    setIsPlaying(false);
  };

  const handleQuickPractice = () => {
    onClose();
    startPractice('char_to_morse', { targetSymbolId: symbol.id });
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'mastered':
        return <span className="text-green-400 font-bold text-xs uppercase tracking-wider">★ Mastered</span>;
      case 'reviewing':
        return <span className="text-zinc-400 font-bold text-xs uppercase tracking-wider">⌛ Review Due</span>;
      case 'learning':
        return <span className="text-green-300 font-bold text-xs uppercase tracking-wider">⚡ Learning</span>;
      default:
        return <span className="text-zinc-500 font-bold text-xs uppercase tracking-wider">○ New Symbol</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#070b08] border border-green-900/60 rounded-3xl shadow-2xl p-6 text-white overflow-hidden">
        {/* Close Button */}
        <button
          onClick={() => {
            handleStopAudio();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Symbol Big Header Display */}
        <div className="flex items-center gap-5 pb-6 border-b border-green-950">
          <div className="w-20 h-20 rounded-2xl bg-black border-2 border-green-600/70 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.3)]">
            <span className="text-3xl font-black text-green-400">{symbol.char}</span>
            <span className="text-xs text-green-300 font-mono tracking-widest mt-0.5">{symbol.morse}</span>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {getStateBadge(stats.state)}
              {!symbol.isBuiltIn && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-green-950 text-green-400 border border-green-800">
                  Custom
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-zinc-100">
              {symbol.description || `Symbol ${symbol.char}`}
            </h3>

            {/* Audio Preview Button */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={isPlaying ? handleStopAudio : handlePlayAudio}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isPlaying
                    ? 'bg-green-500 text-black border-green-400 shadow-[0_0_10px_#22c55e]'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-green-400 border-green-800'
                }`}
              >
                {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? 'Playing...' : 'Play Audio'}</span>
              </button>

              {!symbol.isBuiltIn && onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    handleStopAudio();
                    onEdit();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-bold transition-all cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mastery Progress Bar */}
        <div className="my-5">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-zinc-400 font-semibold">Mastery Score</span>
            <span className="font-bold text-green-400">{stats.masteryScore}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-black overflow-hidden border border-green-950">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500 shadow-[0_0_8px_#22c55e]"
              style={{ width: `${stats.masteryScore}%` }}
            />
          </div>
        </div>

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3 bg-black rounded-2xl border border-green-950">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
              <Target className="w-3.5 h-3.5 text-green-400" />
              <span>Accuracy</span>
            </div>
            <div className="text-xl font-black text-white">
              {accuracy}% <span className="text-xs font-normal text-zinc-400">({stats.correct}/{stats.attempts})</span>
            </div>
          </div>

          <div className="p-3 bg-black rounded-2xl border border-green-950">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
              <Zap className="w-3.5 h-3.5 text-green-400" />
              <span>Streak</span>
            </div>
            <div className="text-xl font-black text-white">
              {stats.consecutiveCorrect} <span className="text-xs font-normal text-zinc-400">in a row</span>
            </div>
          </div>

          <div className="p-3 bg-black rounded-2xl border border-green-950">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-green-400" />
              <span>Avg Speed</span>
            </div>
            <div className="text-xl font-black text-white">
              {stats.avgResponseTimeMs ? `${(stats.avgResponseTimeMs / 1000).toFixed(1)}s` : '—'}
            </div>
          </div>

          <div className="p-3 bg-black rounded-2xl border border-green-950">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-1">
              <Award className="w-3.5 h-3.5 text-green-400" />
              <span>Tested Modes</span>
            </div>
            <div className="text-xl font-black text-white">
              {stats.testedExerciseTypes.length} <span className="text-xs font-normal text-zinc-400">modes</span>
            </div>
          </div>
        </div>

        {/* Recent Attempts History Strip */}
        <div className="mb-6">
          <div className="text-xs text-zinc-400 font-semibold mb-2">Recent Answer Record</div>
          {stats.history.length === 0 ? (
            <div className="text-xs text-zinc-600 italic py-1">No practice attempts recorded yet.</div>
          ) : (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {stats.history.slice(-14).map((record, i) => (
                <div
                  key={i}
                  title={`${record.correct ? 'Correct' : 'Mistake'} (${(record.responseTimeMs / 1000).toFixed(1)}s)`}
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                    record.correct
                      ? 'bg-green-950 text-green-400 border border-green-600'
                      : 'bg-red-950 text-red-400 border border-red-800'
                  }`}
                >
                  {record.correct ? '✓' : '✗'}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Drill Button */}
        <button
          type="button"
          onClick={handleQuickPractice}
          className="w-full py-3 rounded-2xl bg-green-500 hover:bg-green-400 font-black text-black shadow-lg shadow-green-500/25 active:translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Zap className="w-4 h-4 fill-black" />
          <span>Practice "{symbol.char}" Now</span>
        </button>
      </div>
    </div>
  );
};
