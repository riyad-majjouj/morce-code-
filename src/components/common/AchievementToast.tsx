import React, { useEffect } from 'react';
import { Trophy, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AchievementToast: React.FC = () => {
  const { recentAchievementUnlocked, dismissAchievement } = useApp();

  useEffect(() => {
    if (recentAchievementUnlocked) {
      const timer = setTimeout(() => {
        dismissAchievement();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [recentAchievementUnlocked, dismissAchievement]);

  if (!recentAchievementUnlocked) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-6 z-50 animate-bounce">
      <div className="bg-gradient-to-r from-green-500 via-emerald-400 to-green-600 p-0.5 rounded-2xl shadow-2xl shadow-green-500/30">
        <div className="bg-black px-5 py-3.5 rounded-[14px] flex items-center gap-3 text-white border border-green-950">
          <div className="w-10 h-10 rounded-xl bg-green-950 text-green-400 border border-green-600/60 flex items-center justify-center shrink-0 shadow-[0_0_10px_#22c55e]">
            <Trophy className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-black tracking-widest text-green-400">
              Achievement Unlocked!
            </div>
            <div className="text-sm font-bold text-white">{recentAchievementUnlocked}</div>
          </div>
          <button
            type="button"
            onClick={dismissAchievement}
            className="p-1 text-zinc-500 hover:text-white ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
