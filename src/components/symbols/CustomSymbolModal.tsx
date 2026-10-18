import React, { useState } from 'react';
import { AlertTriangle, Check, Play, Square, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { morseAudio } from '../../lib/audio/morseAudio';
import { detectPatternConflict, isValidMorsePattern, normalizeMorse } from '../../lib/morse/morseUtils';
import { MorseSymbol, SymbolCategory } from '../../types/morse';

interface CustomSymbolModalProps {
  onClose: () => void;
  symbolToEdit?: MorseSymbol | null;
}

export const CustomSymbolModal: React.FC<CustomSymbolModalProps> = ({
  onClose,
  symbolToEdit,
}) => {
  const { symbols, createCustomSymbol, updateCustomSymbol, deleteCustomSymbol, userSettings } = useApp();

  const [charInput, setCharInput] = useState(symbolToEdit?.char || '');
  const [morseInput, setMorseInput] = useState(symbolToEdit?.morse || '');
  const [category, setCategory] = useState<SymbolCategory>(symbolToEdit?.category || 'custom');
  const [description, setDescription] = useState(symbolToEdit?.description || '');
  const [includeInCurriculum, setIncludeInCurriculum] = useState(symbolToEdit?.includeInCurriculum ?? true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateWarningMsg, setDuplicateWarningMsg] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAppendDot = () => {
    setMorseInput(prev => prev + '.');
    morseAudio.playTone(userSettings.toneFrequency, 80, userSettings.volume);
  };

  const handleAppendDash = () => {
    setMorseInput(prev => prev + '-');
    morseAudio.playTone(userSettings.toneFrequency, 240, userSettings.volume);
  };

  const handleBackspacePattern = () => {
    setMorseInput(prev => prev.slice(0, -1));
  };

  const handleClearPattern = () => {
    setMorseInput('');
  };

  const handlePreviewAudio = () => {
    if (!isValidMorsePattern(morseInput)) return;
    setIsPlaying(true);
    morseAudio.playSequence(morseInput, {
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

  const handleSave = (bypassDuplicateWarning = false) => {
    setValidationError(null);

    const trimmedChar = charInput.trim().toUpperCase();
    const cleanMorse = normalizeMorse(morseInput);

    if (!trimmedChar) {
      setValidationError('Please enter a display character, abbreviation, or label.');
      return;
    }

    if (!cleanMorse || cleanMorse.length === 0) {
      setValidationError('Morse pattern cannot be empty. Please enter dots and dashes.');
      return;
    }

    if (!isValidMorsePattern(cleanMorse)) {
      setValidationError('Pattern must contain only standard Morse dots (.) and dashes (-).');
      return;
    }

    // Duplicate detection
    if (!bypassDuplicateWarning) {
      const conflict = detectPatternConflict(cleanMorse, trimmedChar, symbols, symbolToEdit?.id);

      if (conflict.hasConflict && conflict.conflictingSymbol) {
        let msg = '';
        if (conflict.isCharDuplicate && conflict.isPatternDuplicate) {
          msg = `Character "${trimmedChar}" and Morse pattern "${cleanMorse}" already exist in symbol "${conflict.conflictingSymbol.char}".`;
        } else if (conflict.isCharDuplicate) {
          msg = `A symbol with label "${trimmedChar}" already exists in your library.`;
        } else if (conflict.isPatternDuplicate) {
          msg = `Pattern "${cleanMorse}" is already used by symbol "${conflict.conflictingSymbol.char}".`;
        }

        setDuplicateWarningMsg(msg);
        setShowDuplicateWarning(true);
        return;
      }
    }

    if (symbolToEdit) {
      updateCustomSymbol(symbolToEdit.id, {
        char: trimmedChar,
        morse: cleanMorse,
        category,
        description: description.trim(),
        includeInCurriculum,
      });
    } else {
      createCustomSymbol({
        char: trimmedChar,
        morse: cleanMorse,
        category,
        description: description.trim(),
        includeInCurriculum,
      });
    }

    handleStopAudio();
    onClose();
  };

  const handleDelete = () => {
    if (symbolToEdit && !symbolToEdit.isBuiltIn) {
      deleteCustomSymbol(symbolToEdit.id);
      handleStopAudio();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#070b08] border border-green-900/60 rounded-3xl shadow-2xl p-6 md:p-8 text-white my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-green-950">
          <div>
            <h3 className="text-xl font-black text-green-300">
              {symbolToEdit ? 'Edit Custom Symbol' : 'Create Custom Symbol'}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Define custom Morse signs, abbreviations, or shorthand symbols
            </p>
          </div>
          <button
            onClick={() => {
              handleStopAudio();
              onClose();
            }}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="mt-4 p-3 bg-red-950/80 border border-red-500/40 rounded-xl text-red-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Duplicate Warning Prompt */}
        {showDuplicateWarning && (
          <div className="mt-4 p-4 bg-zinc-950 border border-green-700/60 rounded-xl text-zinc-200 text-sm space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 text-green-400 mt-0.5" />
              <div>
                <p className="font-bold text-green-300">Duplicate Pattern or Label Notice</p>
                <p className="text-xs text-zinc-400 mt-1">{duplicateWarningMsg}</p>
                <p className="text-xs text-zinc-300 mt-2">
                  Do you want to proceed and save anyway?
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowDuplicateWarning(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300"
              >
                Cancel & Adjust
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-400 text-xs font-bold text-black"
              >
                Yes, Save Anyway
              </button>
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="space-y-5 mt-5">
          {/* Character Label */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              Display Character / Label <span className="text-green-400">*</span>
            </label>
            <input
              type="text"
              maxLength={8}
              value={charInput}
              onChange={e => setCharInput(e.target.value.toUpperCase())}
              placeholder="e.g. SOS, OK, ★, or QTH"
              className="w-full px-4 py-2.5 rounded-xl bg-black border border-green-950 focus:border-green-400 text-white font-bold text-base outline-none uppercase shadow-inner"
            />
          </div>

          {/* Visual Dot/Dash Pad & Pattern Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Morse Code Pattern <span className="text-green-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleClearPattern}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 font-semibold"
              >
                Clear Pattern
              </button>
            </div>

            {/* Pattern Display Screen */}
            <div className="w-full min-h-[56px] px-4 py-2.5 bg-black border-2 border-green-950 rounded-2xl flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                {morseInput.length === 0 ? (
                  <span className="text-zinc-600 font-mono text-sm italic">
                    Tap Dot/Dash buttons below or type [. / -]
                  </span>
                ) : (
                  morseInput.split('').map((pulse, i) => (
                    <span
                      key={i}
                      className={`inline-block ${
                        pulse === '.'
                          ? 'w-4 h-4 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]'
                          : pulse === '-'
                          ? 'w-10 h-3.5 rounded-full bg-green-400 shadow-[0_0_8px_#4ade80]'
                          : 'w-2 h-4'
                      }`}
                    />
                  ))
                )}
              </div>

              {/* Text Input for direct typing */}
              <input
                type="text"
                value={morseInput}
                onChange={e => setMorseInput(e.target.value)}
                placeholder=".-."
                className="w-20 font-mono font-bold text-green-300 text-right bg-transparent outline-none text-sm"
              />
            </div>

            {/* Tactile 3D Buttons for Dot, Dash, Backspace */}
            <div className="grid grid-cols-3 gap-2.5 mt-2.5">
              <button
                type="button"
                onClick={handleAppendDot}
                className="py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-green-800 text-green-400 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />
                <span>Dot ( . )</span>
              </button>

              <button
                type="button"
                onClick={handleAppendDash}
                className="py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-green-800 text-green-400 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <span className="w-8 h-2.5 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]" />
                <span>Dash ( - )</span>
              </button>

              <button
                type="button"
                onClick={handleBackspacePattern}
                disabled={morseInput.length === 0}
                className="py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer disabled:opacity-30"
              >
                <span>⌫ Backspace</span>
              </button>
            </div>
          </div>

          {/* Audio Preview Action */}
          <div className="flex items-center justify-between p-3.5 bg-black border border-green-950 rounded-2xl">
            <div className="text-xs text-zinc-400">
              <span className="font-bold text-white block">Preview Audio Pattern</span>
              Listen to timing and tone at current settings
            </div>
            <button
              type="button"
              onClick={isPlaying ? handleStopAudio : handlePreviewAudio}
              disabled={morseInput.length === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 ${
                isPlaying
                  ? 'bg-green-500 text-black shadow-[0_0_12px_#22c55e]'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-green-400 border border-green-800'
              }`}
            >
              {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Stop' : 'Play Sound'}</span>
            </button>
          </div>

          {/* Category Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as SymbolCategory)}
                className="w-full px-3 py-2.5 rounded-xl bg-black border border-green-950 text-white text-xs font-bold outline-none cursor-pointer focus:border-green-400"
              >
                <option value="custom">Custom / Shorthand</option>
                <option value="letter">Letter</option>
                <option value="digit">Digit</option>
                <option value="punctuation">Punctuation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Distress Signal, Roger"
                className="w-full px-3 py-2.5 rounded-xl bg-black border border-green-950 text-white text-xs outline-none focus:border-green-400 shadow-inner"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-green-950 mt-6">
          {symbolToEdit && !symbolToEdit.isBuiltIn ? (
            !showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors"
                title="Delete this custom symbol"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-1 text-xs text-zinc-400"
                >
                  Cancel
                </button>
              </div>
            )
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                handleStopAudio();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="px-6 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-black font-black text-xs shadow-lg shadow-green-500/25 active:translate-y-0.5 transition-all cursor-pointer"
            >
              {symbolToEdit ? 'Save Changes' : 'Create Symbol'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
