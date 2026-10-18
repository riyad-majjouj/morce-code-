import React, { useState } from 'react';
import {
  Check,
  Edit2,
  Filter,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Square,
  Volume2,
  Wrench,
} from 'lucide-react';
import { CustomSymbolModal } from '../components/symbols/CustomSymbolModal';
import { SymbolDetailModal } from '../components/symbols/SymbolDetailModal';
import { useApp } from '../context/AppContext';
import { morseAudio } from '../lib/audio/morseAudio';
import { MorseSymbol, SymbolCategory } from '../types/morse';

export const LibraryPage: React.FC = () => {
  const {
    symbols,
    toggleSymbolEnabled,
    userSettings,
    selectedSymbolForDetail,
    setSelectedSymbolForDetail,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMastery, setSelectedMastery] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSymbol, setEditingSymbol] = useState<MorseSymbol | null>(null);
  const [playingSymbolId, setPlayingSymbolId] = useState<string | null>(null);

  // Filter symbols
  const filteredSymbols = symbols.filter(sym => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchChar = sym.char.toLowerCase().includes(q);
      const matchMorse = sym.morse.toLowerCase().includes(q);
      const matchDesc = sym.description?.toLowerCase().includes(q);
      if (!matchChar && !matchMorse && !matchDesc) return false;
    }

    // Category filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'custom' && sym.isBuiltIn) return false;
      if (selectedCategory !== 'custom' && sym.category !== selectedCategory) return false;
    }

    // Mastery filter
    if (selectedMastery !== 'all') {
      if (sym.stats.state !== selectedMastery) return false;
    }

    return true;
  });

  const handlePlaySound = (e: React.MouseEvent, sym: MorseSymbol) => {
    e.stopPropagation();
    if (playingSymbolId === sym.id) {
      morseAudio.stopSequence();
      setPlayingSymbolId(null);
      return;
    }
    setPlayingSymbolId(sym.id);
    morseAudio.playSequence(sym.morse, {
      frequency: userSettings.toneFrequency,
      wpm: userSettings.wpm,
      volume: userSettings.volume,
      onComplete: () => setPlayingSymbolId(null),
    });
  };

  const handleToggleEnable = (e: React.MouseEvent, id: string, currentState: boolean) => {
    e.stopPropagation();
    toggleSymbolEnabled(id, !currentState);
  };

  const openEditModal = (sym: MorseSymbol) => {
    setEditingSymbol(sym);
    setIsCreateModalOpen(true);
  };

  const customCount = symbols.filter(s => !s.isBuiltIn).length;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-6 text-white">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-green-300">Morse Symbol Library</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Browse the international telegraph alphabet, review mastery statistics, and invent custom symbols.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingSymbol(null);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-green-500 hover:bg-green-400 text-black font-black text-sm shadow-lg shadow-green-500/25 active:translate-y-0.5 transition-all cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          <span>New Custom Symbol</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-3xl bg-[#070b08] border border-green-950 p-4 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full md:flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by character (A, SOS), Morse pattern (.-.), or description..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black border border-green-950 focus:border-green-400 text-sm text-white placeholder-zinc-600 outline-none transition-all"
            />
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All Symbols' },
              { id: 'letter', label: 'Letters' },
              { id: 'digit', label: 'Digits (0-9)' },
              { id: 'punctuation', label: 'Punctuation' },
              { id: 'custom', label: `Custom (${customCount})` },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-green-950 text-green-300 border border-green-600 shadow-sm shadow-green-600/30'
                    : 'bg-black text-zinc-400 hover:text-white border border-green-950'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Mastery Filter */}
          <select
            value={selectedMastery}
            onChange={e => setSelectedMastery(e.target.value)}
            className="w-full md:w-auto px-3.5 py-2.5 rounded-xl bg-black border border-green-950 text-zinc-300 text-xs font-bold outline-none cursor-pointer focus:border-green-400"
          >
            <option value="all">All Mastery Levels</option>
            <option value="new">New / Untested</option>
            <option value="learning">In Progress (Learning)</option>
            <option value="reviewing">Review Urgency</option>
            <option value="mastered">Mastered (85%+)</option>
          </select>
        </div>
      </div>

      {/* Symbol Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {filteredSymbols.map(sym => {
          const stats = sym.stats;
          const isPlaying = playingSymbolId === sym.id;
          const isMastered = stats.state === 'mastered';
          const isReview = stats.state === 'reviewing';

          return (
            <div
              key={sym.id}
              onClick={() => setSelectedSymbolForDetail(sym)}
              className={`group relative rounded-2xl p-4 flex flex-col justify-between border transition-all cursor-pointer select-none active:translate-y-0.5 ${
                !sym.enabledForPractice
                  ? 'bg-black/40 border-zinc-900 opacity-50'
                  : isMastered
                  ? 'bg-[#070d08] border-green-600/60 shadow-[0_0_12px_rgba(34,197,94,0.15)] hover:border-green-400'
                  : isReview
                  ? 'bg-[#0a0d07] border-green-800/60 hover:border-green-500'
                  : 'bg-[#070b08] border-green-950 hover:border-green-700/80 shadow-md'
              }`}
            >
              {/* Top Row: Mastery Pill & Enabled Toggle */}
              <div className="flex items-center justify-between gap-1 mb-2">
                <span
                  className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isMastered
                      ? 'bg-green-950 text-green-400 border border-green-700/60'
                      : isReview
                      ? 'bg-zinc-900 text-green-300 border border-green-900'
                      : stats.attempts > 0
                      ? 'bg-green-950/60 text-green-400'
                      : 'bg-zinc-900 text-zinc-500'
                  }`}
                >
                  {stats.state}
                </span>

                {/* Practice Toggle Switch */}
                <button
                  type="button"
                  onClick={e => handleToggleEnable(e, sym.id, sym.enabledForPractice)}
                  title={sym.enabledForPractice ? 'Active in exercises' : 'Disabled from exercises'}
                  className={`w-7 h-4 rounded-full transition-colors relative cursor-pointer ${
                    sym.enabledForPractice ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-zinc-800'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-black transition-transform ${
                      sym.enabledForPractice ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Main Character and Morse Pulse Display */}
              <div className="flex flex-col items-center py-2">
                <div className="text-3xl font-black text-white group-hover:scale-110 group-hover:text-green-300 transition-all">
                  {sym.char}
                </div>

                {/* Morse Dot/Dash Visual */}
                <div className="flex items-center gap-1.5 my-2 min-h-[16px]">
                  {sym.morse.split('').map((pulse, pIdx) => (
                    <span
                      key={pIdx}
                      className={`inline-block ${
                        pulse === '.'
                          ? 'w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]'
                          : 'w-5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]'
                      }`}
                    />
                  ))}
                </div>

                <div className="font-mono text-xs text-zinc-400 font-bold tracking-widest">
                  {sym.morse}
                </div>
              </div>

              {/* Card Footer: Audio Preview & Mastery Bar */}
              <div className="mt-3 pt-2 border-t border-green-950 flex items-center justify-between">
                <button
                  type="button"
                  onClick={e => handlePlaySound(e, sym)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isPlaying
                      ? 'bg-green-500 text-black border-green-400 shadow-[0_0_10px_#22c55e]'
                      : 'bg-zinc-950 hover:bg-zinc-900 text-green-400 border-green-950 hover:border-green-800'
                  }`}
                  title="Play Morse audio"
                >
                  {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                <div className="flex items-center gap-2">
                  {!sym.isBuiltIn && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        openEditModal(sym);
                      }}
                      className="p-1 rounded text-zinc-500 hover:text-green-300 transition-colors"
                      title="Edit custom symbol"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-mono text-green-400 font-bold">
                      {stats.masteryScore}%
                    </span>
                    <div className="w-10 h-1 bg-zinc-900 rounded-full overflow-hidden mt-0.5 border border-green-950">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${stats.masteryScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <CustomSymbolModal
          symbolToEdit={editingSymbol}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingSymbol(null);
          }}
        />
      )}

      {selectedSymbolForDetail && (
        <SymbolDetailModal
          symbol={selectedSymbolForDetail}
          onClose={() => setSelectedSymbolForDetail(null)}
          onEdit={() => {
            const sym = selectedSymbolForDetail;
            setSelectedSymbolForDetail(null);
            openEditModal(sym);
          }}
        />
      )}
    </div>
  );
};
