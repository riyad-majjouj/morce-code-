import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Database,
  Download,
  Play,
  RotateCcw,
  Sliders,
  Smartphone,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { morseAudio } from '../lib/audio/morseAudio';
import {
  exportAppStateJSON,
  validateImportData,
} from '../lib/persistence/storage';
import { AppStoredState } from '../lib/persistence/storage';

export const SettingsPage: React.FC = () => {
  const {
    symbols,
    userProgress,
    userSettings,
    updateSettings,
    resetAllProgress,
    importState,
  } = useApp();

  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sound test
  const handleTestTone = () => {
    morseAudio.playSequence('...', {
      frequency: userSettings.toneFrequency,
      wpm: userSettings.wpm,
      volume: userSettings.volume,
    });
  };

  // Export JSON
  const handleExportJSON = () => {
    const state: AppStoredState = {
      version: 2,
      symbols,
      userProgress,
      userSettings,
    };
    const jsonStr = exportAppStateJSON(state);

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `morselingo_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2500);
  };

  // Import JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportStatus(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const text = evt.target?.result as string;
        const validation = validateImportData(text);

        if (!validation.valid || !validation.state) {
          setImportStatus({
            success: false,
            message: validation.error || 'Invalid backup format.',
          });
          return;
        }

        importState(validation.state);
        setImportStatus({
          success: true,
          message: `Successfully restored ${validation.state.symbols.length} symbols and progress!`,
        });
      } catch {
        setImportStatus({
          success: false,
          message: 'Error reading file.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8 text-white">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-black text-green-300">Application Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Customize transmission frequency, audio speed, virtual key calibration, and manage local IndexedDB data.
        </p>
      </div>

      {/* IndexedDB & PWA Active Status Banner */}
      <div className="rounded-3xl bg-[#070d08] border border-green-900/60 p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-black border border-green-700/60 flex items-center justify-center text-green-400 shadow-[0_0_12px_rgba(34,197,94,0.3)] shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span>IndexedDB Local Storage Active</span>
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Your progress, custom symbols, and stats persist automatically in local IndexedDB. You won't start from zero on refresh.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black border border-green-950 font-mono text-xs text-green-400 shrink-0">
          <Smartphone className="w-3.5 h-3.5" />
          <span>PWA Ready</span>
        </div>
      </div>

      {/* Audio Engine Configuration */}
      <div className="rounded-3xl bg-[#070b08] border border-green-950 p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-green-950">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-bold text-white">Audio & Sound Preferences</h2>
          </div>
          <button
            type="button"
            onClick={handleTestTone}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-green-400 border border-green-800/60 text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Test Sound</span>
          </button>
        </div>

        {/* Tone Frequency */}
        <div>
          <div className="flex justify-between items-center text-sm font-semibold mb-2">
            <span className="text-zinc-300">Tone Frequency</span>
            <span className="font-mono text-green-400 font-bold">{userSettings.toneFrequency} Hz</span>
          </div>
          <input
            type="range"
            min={350}
            max={900}
            step={25}
            value={userSettings.toneFrequency}
            onChange={e => updateSettings({ toneFrequency: Number(e.target.value) })}
            className="w-full accent-green-500 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-zinc-500 mt-1 font-mono">
            <span>350 Hz (Low Pitch)</span>
            <span>650 Hz (Standard CW)</span>
            <span>900 Hz (High Pitch)</span>
          </div>
        </div>

        {/* Transmission Speed (WPM) */}
        <div>
          <div className="flex justify-between items-center text-sm font-semibold mb-2">
            <span className="text-zinc-300">Transmission Speed (WPM)</span>
            <span className="font-mono text-green-300 font-bold">{userSettings.wpm} WPM</span>
          </div>
          <input
            type="range"
            min={5}
            max={30}
            step={1}
            value={userSettings.wpm}
            onChange={e => updateSettings({ wpm: Number(e.target.value) })}
            className="w-full accent-green-400 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-zinc-500 mt-1 font-mono">
            <span>5 WPM (Beginner)</span>
            <span>15 WPM (Standard)</span>
            <span>30 WPM (High Speed)</span>
          </div>
        </div>

        {/* Volume */}
        <div>
          <div className="flex justify-between items-center text-sm font-semibold mb-2">
            <span className="text-zinc-300">Volume Level</span>
            <span className="font-mono text-green-400 font-bold">
              {Math.round(userSettings.volume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.05}
            value={userSettings.volume}
            onChange={e => updateSettings({ volume: Number(e.target.value) })}
            className="w-full accent-green-500 cursor-pointer"
          />
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <label className="flex items-center gap-3 p-3 bg-black border border-green-950 rounded-2xl cursor-pointer">
            <input
              type="checkbox"
              checked={userSettings.soundEffects}
              onChange={e => updateSettings({ soundEffects: e.target.checked })}
              className="w-4 h-4 rounded text-green-500 bg-zinc-900 border-zinc-700 accent-green-500"
            />
            <span className="text-xs text-zinc-300 font-semibold">Enable Gamification Sound Effects</span>
          </label>

          <label className="flex items-center gap-3 p-3 bg-black border border-green-950 rounded-2xl cursor-pointer">
            <input
              type="checkbox"
              checked={userSettings.autoPlayAudio}
              onChange={e => updateSettings({ autoPlayAudio: e.target.checked })}
              className="w-4 h-4 rounded text-green-500 bg-zinc-900 border-zinc-700 accent-green-500"
            />
            <span className="text-xs text-zinc-300 font-semibold">Auto-play Morse Audio on Question Load</span>
          </label>
        </div>
      </div>

      {/* Virtual Telegraph Key Calibration */}
      <div className="rounded-3xl bg-[#070b08] border border-green-950 p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-green-950">
          <Sliders className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-bold text-white">Telegraph Key Calibration</h2>
        </div>

        <div>
          <div className="flex justify-between items-center text-sm font-semibold mb-2">
            <span className="text-zinc-300">Dot / Dash Duration Threshold</span>
            <span className="font-mono text-green-400 font-bold">
              {userSettings.keyCalibrationDotMaxMs || 220} ms
            </span>
          </div>
          <input
            type="range"
            min={100}
            max={350}
            step={10}
            value={userSettings.keyCalibrationDotMaxMs || 220}
            onChange={e => updateSettings({ keyCalibrationDotMaxMs: Number(e.target.value) })}
            className="w-full accent-green-500 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-zinc-500 mt-1 font-mono">
            <span>100 ms (Fast Fingers)</span>
            <span>220 ms (Default Balanced)</span>
            <span>350 ms (Forgiving)</span>
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            Presses shorter than this duration produce a Dot (•). Presses longer produce a Dash (—).
          </p>
        </div>
      </div>

      {/* Persistence & Data Backup */}
      <div className="rounded-3xl bg-[#070b08] border border-green-950 p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-green-950">
          <Database className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-bold text-white">Backup & Restore</h2>
        </div>

        <p className="text-xs text-zinc-400">
          Export your entire learning state, custom symbols, and statistics to an offline JSON file, or restore from an existing backup.
        </p>

        {importStatus && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
              importStatus.success
                ? 'bg-green-950/80 border border-green-500/50 text-green-300'
                : 'bg-red-950/80 border border-red-500/50 text-red-300'
            }`}
          >
            {importStatus.success ? <Check className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
            <span>{importStatus.message}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleExportJSON}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-green-800 text-xs font-bold text-green-400 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>{copiedExport ? 'Downloaded Backup!' : 'Export JSON Backup'}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-green-800 text-xs font-bold text-green-400 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Import JSON Backup</span>
          </button>
        </div>

        {/* Reset Confirmation */}
        <div className="pt-4 border-t border-green-950">
          {!showResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset all learning progress & restore default state</span>
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-zinc-950 border border-red-900/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Confirm Reset? This will wipe progress and custom symbols from IndexedDB.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetAllProgress();
                    setShowResetConfirm(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer shadow-sm"
                >
                  Yes, Reset Everything
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
