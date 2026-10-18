import React from 'react';
import { BarChart3, BookOpen, Compass, Database, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Navbar: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  const navItems = [
    { id: 'learn', label: 'Learn', icon: BookOpen },
    { id: 'practice', label: 'Practice', icon: Compass },
    { id: 'library', label: 'Symbol Library', icon: Database },
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <>
      {/* Desktop / Tablet Top/Sub Navigation Bar */}
      <nav className="w-full bg-black border-b border-green-950 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-center sm:justify-start gap-1 sm:gap-2 py-2 overflow-x-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap active:translate-y-0.5 ${
                  isActive
                    ? 'bg-green-950 text-green-300 border border-green-600/60 shadow-[0_0_12px_rgba(34,197,94,0.25)]'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-950 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-green-400' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Fixed Bottom Navigation */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-black/95 backdrop-blur-lg border-t border-green-950 px-2 py-1.5 flex sm:hidden justify-around items-center">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                isActive ? 'text-green-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive ? 'bg-green-950 border border-green-600/50 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : ''
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="mt-0.5">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
