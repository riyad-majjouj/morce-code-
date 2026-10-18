import React from 'react';
import { AchievementToast } from './components/common/AchievementToast';
import { Header } from './components/layout/Header';
import { Navbar } from './components/layout/Navbar';
import { LessonSession } from './components/lessons/LessonSession';
import { PracticeSession } from './components/practice/PracticeSession';
import { AppProvider, useApp } from './context/AppContext';
import { LearnPage } from './pages/LearnPage';
import { LibraryPage } from './pages/LibraryPage';
import { PracticePage } from './pages/PracticePage';
import { SettingsPage } from './pages/SettingsPage';
import { StatsPage } from './pages/StatsPage';

const AppContent: React.FC = () => {
  const {
    activeTab,
    activeLessonModal,
    closeLessonModal,
    activePracticeModal,
    closePracticeModal,
  } = useApp();

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col font-sans selection:bg-green-500 selection:text-black">
      {/* Top Header */}
      <Header />

      {/* Navigation Sub-bar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 pb-24 sm:pb-12">
        {activeTab === 'learn' && <LearnPage />}
        {activeTab === 'practice' && <PracticePage />}
        {activeTab === 'library' && <LibraryPage />}
        {activeTab === 'stats' && <StatsPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>

      {/* Lesson Runner Modal */}
      {activeLessonModal && (
        <LessonSession lesson={activeLessonModal} onClose={closeLessonModal} />
      )}

      {/* Practice Runner Modal */}
      {activePracticeModal && (
        <PracticeSession
          exerciseType={activePracticeModal.type}
          customOnly={activePracticeModal.customOnly}
          targetSymbolId={activePracticeModal.targetSymbolId}
          onClose={closePracticeModal}
        />
      )}

      {/* Toast notifications */}
      <AchievementToast />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
