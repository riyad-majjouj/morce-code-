import React, { useEffect, useRef, useState } from 'react';
import { Delete, RotateCcw, Send, Sparkles, Volume2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { morseAudio } from '../../lib/audio/morseAudio';

interface TelegraphKeyProps {
  onPatternSubmit?: (pattern: string) => void;
  onBufferChange?: (buffer: string) => void;
  expectedPattern?: string;
  showExpected?: boolean;
  disabled?: boolean;
  allowSpaceSeparator?: boolean;
}

export const TelegraphKey: React.FC<TelegraphKeyProps> = ({
  onPatternSubmit,
  onBufferChange,
  expectedPattern,
  showExpected = false,
  disabled = false,
  allowSpaceSeparator = true,
}) => {
  const { userSettings } = useApp();
  const [isPressed, setIsPressed] = useState(false);
  const [currentBuffer, setCurrentBuffer] = useState<string>('');
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null);

  const isPressedRef = useRef(false);
  const currentBufferRef = useRef('');
  const pressStartTimeRef = useRef<number | null>(null);
  const onPatternSubmitRef = useRef(onPatternSubmit);
  const onBufferChangeRef = useRef(onBufferChange);
  const activePointerIdRef = useRef<number | null>(null);

  onPatternSubmitRef.current = onPatternSubmit;
  onBufferChangeRef.current = onBufferChange;

  // Dot threshold in ms: under threshold = dot, over = dash
  const dotThresholdMs = userSettings.keyCalibrationDotMaxMs || 220;

  // Sound and Tone handling
  const handlePressDown = (e?: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || isPressedRef.current) return;

    if (e) {
      activePointerIdRef.current = e.pointerId;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore if not supported
      }
    }

    isPressedRef.current = true;
    setIsPressed(true);
    pressStartTimeRef.current = Date.now();

    morseAudio.startTelegraphTone(userSettings.toneFrequency, userSettings.volume);
  };

  const handlePressUp = (e?: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || !isPressedRef.current || pressStartTimeRef.current === null) return;

    if (e && activePointerIdRef.current !== null) {
      try {
        e.currentTarget.releasePointerCapture(activePointerIdRef.current);
      } catch {
        // ignore
      }
      activePointerIdRef.current = null;
    }

    isPressedRef.current = false;
    setIsPressed(false);
    morseAudio.stopTelegraphTone();

    const duration = Date.now() - pressStartTimeRef.current;
    pressStartTimeRef.current = null;
    setLastDurationMs(duration);

    // Filter out accidental micro-taps (< 20ms)
    if (duration < 20) return;

    const symbol = duration < dotThresholdMs ? '.' : '-';
    const updated = currentBufferRef.current + symbol;
    currentBufferRef.current = updated;
    setCurrentBuffer(updated);
    onBufferChangeRef.current?.(updated);
  };

  const handleDirectAdd = (symbol: '.' | '-' | ' ') => {
    if (disabled) return;
    if (symbol !== ' ') {
      morseAudio.playTone(
        userSettings.toneFrequency,
        symbol === '.' ? 80 : 240,
        userSettings.volume
      );
    }
    const updated = currentBufferRef.current + symbol;
    currentBufferRef.current = updated;
    setCurrentBuffer(updated);
    onBufferChangeRef.current?.(updated);
  };

  const handleClear = () => {
    currentBufferRef.current = '';
    setCurrentBuffer('');
    setLastDurationMs(null);
    onBufferChangeRef.current?.('');
  };

  const handleBackspace = () => {
    const updated = currentBufferRef.current.slice(0, -1);
    currentBufferRef.current = updated;
    setCurrentBuffer(updated);
    onBufferChangeRef.current?.(updated);
  };

  const handleSubmit = () => {
    const pattern = currentBufferRef.current.trim();
    if (pattern && onPatternSubmitRef.current) {
      onPatternSubmitRef.current(pattern);
    }
  };

  // Keyboard Spacebar, Dot, Dash, Backspace, Enter listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        handlePressDown();
      } else if ((e.key === '.' || e.code === 'Period' || e.key === 'd') && !e.repeat) {
        e.preventDefault();
        handleDirectAdd('.');
      } else if ((e.key === '-' || e.code === 'Minus' || e.key === '_' || e.key === 'f') && !e.repeat) {
        e.preventDefault();
        handleDirectAdd('-');
      } else if (e.code === 'Enter') {
        if (currentBufferRef.current.length > 0) {
          e.preventDefault();
          handleSubmit();
        }
      } else if (e.code === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleClear();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handlePressUp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      morseAudio.stopTelegraphTone();
    };
  }, [disabled, dotThresholdMs, userSettings.toneFrequency, userSettings.volume]);

  return (
    <div className="w-full flex flex-col items-center bg-[#070b08] border border-green-900/40 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-md">
      {/* Top Display Buffer */}
      <div className="w-full flex flex-col items-center mb-5">
        <div className="flex items-center justify-between w-full mb-2 px-1">
          <span className="text-[11px] uppercase tracking-wider text-green-400 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]" />
            Keyed Morse Transmission
          </span>
          {showExpected && expectedPattern && (
            <span className="text-[11px] text-zinc-400 font-mono">
              Target: <span className="text-green-300 font-bold">{expectedPattern}</span>
            </span>
          )}
        </div>

        {/* Buffer Display Box */}
        <div className="w-full min-h-[68px] bg-black border-2 border-green-950 rounded-2xl flex items-center justify-center px-4 py-2 gap-2 overflow-x-auto shadow-inner">
          {currentBuffer.length === 0 ? (
            <span className="text-zinc-600 text-sm font-mono italic select-none">
              Tap / hold knob, press [Spacebar], or use [. / -] buttons...
            </span>
          ) : (
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {currentBuffer.split('').map((char, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center justify-center font-mono font-bold transition-all ${
                    char === '.'
                      ? 'w-6 h-6 rounded-full bg-green-500 text-black shadow-[0_0_12px_rgba(34,197,94,0.7)] text-lg'
                      : char === '-'
                      ? 'w-12 h-5 rounded-full bg-green-400 text-black shadow-[0_0_12px_rgba(74,222,128,0.7)] text-lg'
                      : 'w-4 h-6 text-zinc-500 text-sm font-mono'
                  }`}
                >
                  {char === '.' ? '•' : char === '-' ? '—' : '␣'}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Live Calibration / Duration Readout */}
        <div className="flex items-center justify-between w-full mt-2 text-[11px] text-zinc-400 px-1 font-mono">
          <div>
            Threshold: <span className="text-green-400 font-bold">&lt;{dotThresholdMs}ms</span> (Dot •),{' '}
            <span className="text-green-300 font-bold">&ge;{dotThresholdMs}ms</span> (Dash —)
          </div>
          {lastDurationMs !== null && (
            <div>
              Signal: <span className="text-green-400 font-bold">{lastDurationMs}ms</span>{' '}
              <span className="text-zinc-300">({lastDurationMs < dotThresholdMs ? 'Dot •' : 'Dash —'})</span>
            </div>
          )}
        </div>
      </div>

      {/* Direct Tactile Dot / Dash / Space Buttons */}
      <div className="flex items-center gap-2 mb-4 flex-wrap justify-center">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDirectAdd('.')}
          className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-green-800/50 text-green-400 text-xs font-bold flex items-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm hover:border-green-500"
        >
          <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
          <span>Dot ( . )</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => handleDirectAdd('-')}
          className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-green-800/50 text-green-400 text-xs font-bold flex items-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm hover:border-green-500"
        >
          <span className="w-6 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_#4ade80]" />
          <span>Dash ( - )</span>
        </button>

        {allowSpaceSeparator && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleDirectAdd(' ')}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm hover:text-green-300"
            title="Add space between letters in word exercises"
          >
            <span>␣ Space / Next Letter</span>
          </button>
        )}
      </div>

      {/* Cyber-Tactical Black & Green Telegraph Key Mechanism */}
      <div className="relative w-full max-w-sm h-48 flex items-center justify-center my-1 select-none">
        {/* Tactical Matte Black Baseplate */}
        <div className="absolute inset-x-2 bottom-2 top-4 bg-gradient-to-b from-[#0a0f0a] to-[#040604] rounded-2xl border-2 border-green-900/40 shadow-2xl flex flex-col justify-between p-3 overflow-hidden">
          <div className="w-full h-0.5 bg-green-500/20 rounded-full" />
          <div className="flex justify-between items-center px-4 text-[9px] font-mono tracking-widest text-green-500/50 uppercase">
            <span>Tactical MK-IV Key</span>
            <span>Electro-Magnetic</span>
          </div>
        </div>

        {/* Pivot Post */}
        <div className="absolute left-1/4 top-12 w-6 h-16 bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-900 rounded-sm border border-green-900/60 shadow-md z-10" />

        {/* Illuminated Green Contact Anvil */}
        <div className="absolute right-1/4 top-24 w-9 h-9 bg-black rounded-full border-2 border-green-700 shadow-inner z-10 flex items-center justify-center">
          <div
            className={`w-4 h-4 rounded-full transition-all duration-75 ${
              isPressed
                ? 'bg-green-400 shadow-[0_0_16px_#22c55e] scale-125'
                : 'bg-green-950 border border-green-800/40'
            }`}
          />
        </div>

        {/* Spring Column */}
        <div className="absolute left-1/3 top-20 w-4 h-10 border-x-2 border-dashed border-green-500/30 z-0" />

        {/* Articulated Lever Arm with Knob */}
        <button
          type="button"
          disabled={disabled}
          onPointerDown={handlePressDown}
          onPointerUp={handlePressUp}
          onPointerCancel={handlePressUp}
          onContextMenu={e => e.preventDefault()}
          className={`group relative z-20 w-3/4 h-24 flex items-center justify-end pr-4 cursor-pointer focus:outline-none transition-transform duration-75 origin-[28%_60%] touch-none ${
            isPressed ? 'rotate-2 translate-y-1.5' : 'rotate-0 translate-y-0 hover:-rotate-1'
          }`}
          aria-label="Telegraph Key (Hold for Dash, Tap for Dot)"
        >
          {/* Titanium Lever Beam */}
          <div className="absolute left-4 right-12 h-5 bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-950 rounded-sm shadow-lg border-t border-zinc-600" />

          {/* Contact Hammer Tip on Lever */}
          <div
            className={`absolute right-20 top-7 w-4 h-5 rounded-b transition-colors ${
              isPressed ? 'bg-green-400 shadow-[0_0_12px_#22c55e]' : 'bg-zinc-600'
            }`}
          />

          {/* Matte Black Knob with Glowing Green Core */}
          <div
            className={`relative w-16 h-16 rounded-full bg-gradient-to-br from-zinc-800 to-black shadow-2xl border-4 flex items-center justify-center transition-all ${
              isPressed
                ? 'border-green-400 shadow-[0_0_24px_rgba(34,197,94,0.6)] scale-95'
                : 'border-zinc-700 group-hover:border-green-600 group-hover:scale-105'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-green-400 text-xs font-bold shadow-inner">
              <Volume2 className={`w-4 h-4 transition-all ${isPressed ? 'scale-125 text-green-300' : 'text-zinc-500'}`} />
            </div>
          </div>
        </button>
      </div>

      {/* Helper instruction */}
      <div className="text-[11px] text-zinc-400 mb-2 font-medium text-center">
        Tap knob or [Spacebar] for <span className="text-green-400 font-bold">Dot •</span>, hold for <span className="text-green-300 font-bold">Dash —</span>. Press [Enter] to submit.
      </div>

      {/* Buffer Action Controls */}
      <div className="w-full flex items-center justify-between mt-2 pt-3 border-t border-green-950">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled || currentBuffer.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors border border-zinc-800 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            disabled={disabled || currentBuffer.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors border border-zinc-800 cursor-pointer"
          >
            <Delete className="w-3.5 h-3.5" />
            Del
          </button>
        </div>

        {onPatternSubmit && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled || currentBuffer.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-green-500 hover:bg-green-400 text-black shadow-lg shadow-green-500/25 disabled:opacity-30 disabled:pointer-events-none active:translate-y-0.5 transition-all cursor-pointer"
          >
            <span>Submit Pattern</span>
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
