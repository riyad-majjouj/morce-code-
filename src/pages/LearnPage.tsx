import React from 'react';
import {
  Award,
  Check,
  ChevronRight,
  Flame,
  Lock,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CURRICULUM } from '../data/curriculum';
import { LessonConfig } from '../types/morse';

export const LearnPage: React.FC = () => {
  const { symbols, userProgress, startLesson, setSelectedSymbolForDetail, startPractice } = useApp();

  const allLessons = CURRICULUM.flatMap(u => u.lessons);
  const totalLessonsCount = allLessons.length;
  const completedLessonsCount = Object.values(userProgress.completedLessons).filter(l => l.completed).length;
  const courseProgressPct = Math.round((completedLessonsCount / totalLessonsCount) * 100);

  const currentLesson: LessonConfig =
    allLessons.find(l => userProgress.unlockedLessonIds.includes(l.id) && !userProgress.completedLessons[l.id]?.completed) ||
    allLessons[0];

  const recentlyLearned = symbols
    .filter(s => s.stats.attempts > 0)
    .sort((a, b) => (b.stats.lastPracticed || 0) - (a.stats.lastPracticed || 0))
    .slice(0, 5);

  const symbolsNeedingPractice = symbols
    .filter(s => s.stats.attempts >= 2 && (s.stats.correct / s.stats.attempts < 0.75 || s.stats.state === 'reviewing'))
    .sort((a, b) => (a.stats.correct / (a.stats.attempts || 1)) - (b.stats.correct / (b.stats.attempts || 1)))
    .slice(0, 4);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-10 text-white">
      {/* Duolingo-Inspired Dashboard Summary Card */}
      <div className="relative overflow-hidden rounded-3xl bg-[#070b08] border border-green-900/60 p-6 md:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-950 border border-green-800/60 text-green-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-green-400" />
              <span>Current Course Milestone</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {currentLesson ? currentLesson.title : 'Course Completed!'}
            </h1>
            <p className="text-sm text-zinc-300 max-w-xl">
              {currentLesson
                ? currentLesson.description
                : 'Congratulations! You have completed all curriculum units. Keep reviewing to maintain fluency.'}
            </p>

            {/* Quick Course Progress Bar */}
            <div className="pt-2 max-w-md">
              <div className="flex justify-between text-xs text-zinc-400 font-semibold mb-1">
                <span>Course Completion</span>
                <span className="text-green-400 font-bold">{courseProgressPct}% ({completedLessonsCount}/{totalLessonsCount} lessons)</span>
              </div>
              <div className="w-full h-2.5 bg-black rounded-full overflow-hidden border border-green-950">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500 shadow-[0_0_10px_#22c55e]"
                  style={{ width: `${courseProgressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Continue Learning CTA Button */}
          {currentLesson && (
            <button
              type="button"
              onClick={() => startLesson(currentLesson)}
              className="group self-start md:self-center flex items-center gap-3 px-8 py-4 rounded-2xl bg-green-500 hover:bg-green-400 text-black font-black text-base shadow-xl shadow-green-500/25 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-4 h-4 fill-black text-black ml-0.5" />
              </div>
              <span>Continue Learning</span>
            </button>
          )}
        </div>

        {/* Diagnostic Sub-panels: Recently Learned & Requiring Practice */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-green-950">
          {/* Recently Learned */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-green-400" />
              <span>Recently Practiced Symbols</span>
            </div>
            {recentlyLearned.length === 0 ? (
              <span className="text-xs text-zinc-500 italic">No symbols practiced yet. Start lesson 1!</span>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {recentlyLearned.map(sym => (
                  <button
                    key={sym.id}
                    onClick={() => setSelectedSymbolForDetail(sym)}
                    className="px-3 py-1.5 rounded-xl bg-black border border-green-900/60 hover:border-green-400 font-mono text-xs font-bold flex items-center gap-1.5 transition-all text-green-300 cursor-pointer"
                  >
                    <span>{sym.char}</span>
                    <span className="text-zinc-500 font-mono">({sym.morse})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Requiring Practice */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-green-400" />
              <span>Focus Weakness Queue</span>
            </div>
            {symbolsNeedingPractice.length === 0 ? (
              <span className="text-xs text-zinc-500 italic">All practiced symbols are in strong standing!</span>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {symbolsNeedingPractice.map(sym => (
                  <button
                    key={sym.id}
                    onClick={() => setSelectedSymbolForDetail(sym)}
                    className="px-3 py-1.5 rounded-xl bg-black border border-green-800 hover:border-green-400 text-green-400 font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>{sym.char}</span>
                    <span className="text-[10px] text-zinc-400">
                      {Math.round((sym.stats.correct / (sym.stats.attempts || 1)) * 100)}%
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Learning Path Curriculum Map */}
      <div className="space-y-12">
        {CURRICULUM.map(unit => {
          const unitCompletedLessons = unit.lessons.filter(l => userProgress.completedLessons[l.id]?.completed).length;
          const isUnitFullyCompleted = unitCompletedLessons === unit.lessons.length;

          return (
            <div key={unit.id} className="relative">
              {/* Unit Header Card */}
              <div className="rounded-3xl bg-[#070b08] border border-green-950 p-6 mb-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs uppercase tracking-wider font-extrabold text-green-400">
                      Unit {unit.unitNumber}
                    </span>
                    {isUnitFullyCompleted && (
                      <span className="px-2 py-0.5 rounded-full bg-green-950 text-green-400 border border-green-700/60 text-[10px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-green-400" />
                        Completed
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-white">{unit.title}</h2>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xl">{unit.description}</p>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-400 bg-black px-3 py-1.5 rounded-xl border border-green-950 self-start md:self-auto">
                  <span>{unitCompletedLessons} / {unit.lessons.length} Lessons</span>
                </div>
              </div>

              {/* Duolingo Winding Lesson Nodes Path */}
              <div className="relative flex flex-col items-center gap-6 py-2">
                {unit.lessons.map((lesson, idx) => {
                  const isCompleted = Boolean(userProgress.completedLessons[lesson.id]?.completed);
                  const isUnlocked = userProgress.unlockedLessonIds.includes(lesson.id);
                  const isCurrent = isUnlocked && !isCompleted;
                  const score = userProgress.completedLessons[lesson.id]?.score;

                  // Alternating node horizontal alignment
                  const alignOffsets = ['translate-x-0', 'translate-x-8 sm:translate-x-12', 'translate-x-0', '-translate-x-8 sm:-translate-x-12'];
                  const alignClass = alignOffsets[idx % alignOffsets.length];

                  return (
                    <div
                      key={lesson.id}
                      className={`relative flex flex-col items-center transition-all ${alignClass}`}
                    >
                      {/* Node Action Button */}
                      <button
                        type="button"
                        disabled={!isUnlocked}
                        onClick={() => startLesson(lesson)}
                        className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-xl active:translate-y-1 ${
                          isCompleted
                            ? 'bg-green-500 hover:bg-green-400 text-black border-4 border-green-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                            : isCurrent
                            ? 'bg-black text-green-400 border-4 border-green-400 shadow-[0_0_25px_rgba(34,197,94,0.5)] ring-4 ring-green-500/30 animate-pulse'
                            : 'bg-zinc-950 text-zinc-600 border-4 border-zinc-800 opacity-60 cursor-not-allowed'
                        }`}
                        title={lesson.title}
                      >
                        {isCompleted ? (
                          <Check className="w-8 h-8 stroke-[3]" />
                        ) : isUnlocked ? (
                          <Play className="w-7 h-7 fill-current ml-1 text-green-400" />
                        ) : (
                          <Lock className="w-6 h-6 text-zinc-600" />
                        )}

                        {/* Lesson number badge */}
                        <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-black text-[10px] font-black border border-green-900/60 text-green-400 shadow">
                          {lesson.lessonNumber}
                        </div>
                      </button>

                      {/* Lesson Details Card Label */}
                      <div className="text-center mt-2 max-w-[180px]">
                        <h4 className={`text-xs font-bold leading-tight ${isUnlocked ? 'text-zinc-200' : 'text-zinc-600'}`}>
                          {lesson.title}
                        </h4>
                        {isCompleted && score !== undefined && (
                          <span className="text-[10px] font-bold text-green-400 font-mono">
                            Score: {score}%
                          </span>
                        )}
                        {isCurrent && (
                          <span className="inline-block mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-black bg-green-400 px-2 py-0.5 rounded-full shadow">
                            START
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
