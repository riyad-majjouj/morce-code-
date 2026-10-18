import React, { useEffect, useState } from 'react';
import { Download, Flame, Radio, Volume2, VolumeX, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Header: React.FC = () => {
  const { userProgress, userSettings, updateSettings } = useApp();
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  // Listen for PWA beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsAppInstalled(true);
      setInstallPrompt(null);
    }
  };

  // Calculate Level (100 XP per level)
  const currentLevel = Math.floor(userProgress.xp / 100) + 1;
  const xpIntoCurrentLevel = userProgress.xp % 100;

  // Daily goal calculation
  const goalTarget = userSettings.dailyGoalXp || 30;
  const goalProgress = Math.min(100, Math.round((userProgress.todayXp / goalTarget) * 100));

  const toggleSound = () => {
    updateSettings({ soundEffects: !userSettings.soundEffects });
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-black/90 backdrop-blur-md border-b border-green-950/80 px-4 py-3 text-white">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-black border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] flex items-center justify-center">
            <Radio className="w-5 h-5 text-green-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg tracking-tight text-white">
                Morse<span className="text-green-400">Lingo</span>
              </span>
              <span className="text-[10px] font-mono tracking-widest text-green-400 font-bold px-1.5 py-0.5 rounded bg-green-950/80 border border-green-800/60 shadow-[0_0_8px_rgba(34,197,94,0.3)]">
                • — •
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 font-medium hidden sm:block">
              Duolingo-Style Morse Academy
            </div>
          </div>
        </div>

        {/* Dashboard Status Pill Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install Button if available */}
          {installPrompt && !isAppInstalled && (
            <button
              onClick={handleInstallClick}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-950 hover:bg-green-900 border border-green-700/60 text-green-400 text-xs font-bold transition-all shadow-[0_0_10px_rgba(34,197,94,0.2)] cursor-pointer"
              title="Install MorseLingo as an app on your device"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}

          {/* Level Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-zinc-950 border border-green-950 shadow-sm">
            <div className="w-6 h-6 rounded-full bg-green-950 text-green-400 border border-green-700/60 flex items-center justify-center text-xs font-black shadow-[0_0_6px_rgba(34,197,94,0.3)]">
              {currentLevel}
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-[10px] uppercase font-bold text-zinc-400">Level {currentLevel}</span>
              <div className="w-16 h-1.5 bg-zinc-900 rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full bg-green-400 rounded-full"
                  style={{ width: `${xpIntoCurrentLevel}%` }}
                />
              </div>
            </div>
          </div>

          {/* Daily Streak Flame */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border transition-all ${
              userProgress.streak > 0
                ? 'bg-green-950/80 border-green-600/50 text-green-400 shadow-[0_0_8px_rgba(34,197,94,0.2)]'
                : 'bg-zinc-950 border-zinc-800 text-zinc-600'
            }`}
            title="Daily Practice Streak"
          >
            <Flame className={`w-4 h-4 ${userProgress.streak > 0 ? 'fill-green-400 text-green-400' : ''}`} />
            <span className="font-black text-xs">{userProgress.streak}</span>
          </div>

          {/* Total XP */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-zinc-950 border border-green-950 text-green-300 font-black text-xs"
            title="Total Experience Points"
          >
            <Zap className="w-4 h-4 text-green-400 fill-green-400" />
            <span>{userProgress.xp} XP</span>
          </div>

          {/* Daily Goal Gauge */}
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-zinc-950 border border-green-950"
            title={`Today's Goal: ${userProgress.todayXp}/${goalTarget} XP`}
          >
            <div className="text-[10px] font-bold text-zinc-400">Goal:</div>
            <div className="w-12 h-2 bg-zinc-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-green-400">{goalProgress}%</span>
          </div>

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2 rounded-2xl border transition-all cursor-pointer ${
              userSettings.soundEffects
                ? 'bg-zinc-950 border-green-900/60 text-green-400 hover:border-green-500 hover:text-green-300'
                : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:text-zinc-400'
            }`}
            title={userSettings.soundEffects ? 'Sound Effects Enabled' : 'Sound Effects Muted'}
          >
            {userSettings.soundEffects ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
