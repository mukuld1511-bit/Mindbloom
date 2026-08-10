import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ContentUpload } from './components/ContentUpload';
import { KnowledgeGraphView } from './components/KnowledgeGraphView';
import { QuizInterface } from './components/QuizInterface';
import { EntityBrowser } from './components/EntityBrowser';
import { ProgressDashboard } from './components/ProgressDashboard';
import { SourcesList } from './components/SourcesList';
import { DailyChallenge } from './components/DailyChallenge';
import { UserStats } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  const fetchUserStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setUserStats(data);
      }
    } catch (err) {
      console.error('Failed to load user stats:', err);
    }
  };

  useEffect(() => {
    fetchUserStats();
  }, []);

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1C1B19] font-sans flex flex-col selection:bg-[#3D5A45] selection:text-white">
      {/* Top Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} userStats={userStats} />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Signature Top Strip Header */}
            <div className="bg-white border border-[#E4E1D8] border-l-2 border-l-[#3D5A45] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="font-mono text-[#6B6A63]">
                <span>Date: </span>
                <span className="text-[#1C1B19] font-medium">{formattedDate}</span>
              </div>
              <div className="font-mono text-[#3D5A45] font-medium flex items-center space-x-3">
                <span>{userStats?.dueTodayCount || 0} reviews due today</span>
                <button
                  onClick={() => setActiveTab('quiz')}
                  className="px-2.5 py-1 bg-[#3D5A45] text-white hover:bg-[#2D4333] transition-colors rounded text-[11px] font-sans"
                >
                  Start Review
                </button>
              </div>
            </div>

            {/* Notebook Overview Section */}
            <div className="bg-white border border-[#E4E1D8] p-6 space-y-4">
              <div className="space-y-2">
                <span className="text-[11px] font-mono text-[#6B6A63] uppercase tracking-wider block">
                  Notebook System Architecture
                </span>
                <h1 className="font-serif text-2xl font-semibold text-[#1C1B19] tracking-tight">
                  Personal Knowledge Graph & Spaced Repetition Engine
                </h1>
                <p className="text-xs sm:text-sm text-[#6B6A63] leading-relaxed">
                  Extracts entities using local pattern-and-dictionary matching, no external API calls required. Ranks key terms with TF-IDF & TextRank. Difficulty and performance are predicted by small logistic-regression models trained on your own quiz history via SGD, retrained automatically as you review. All data persists locally to SQLite.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E4E1D8]">
                <button
                  onClick={() => setActiveTab('quiz')}
                  className="px-4 py-2 bg-[#3D5A45] hover:bg-[#2D4333] text-white text-xs font-medium transition-colors rounded"
                >
                  Start SM-2 Quiz ({userStats?.dueTodayCount || 0} Due)
                </button>

                <button
                  onClick={() => setActiveTab('graph')}
                  className="px-4 py-2 bg-[#FAFAF8] hover:bg-[#F4F3EE] text-[#1C1B19] border border-[#E4E1D8] text-xs font-medium transition-colors rounded"
                >
                  Explore Knowledge Graph
                </button>

                <button
                  onClick={() => setActiveTab('add-content')}
                  className="px-4 py-2 bg-[#FAFAF8] hover:bg-[#F4F3EE] text-[#1C1B19] border border-[#E4E1D8] text-xs font-medium transition-colors rounded"
                >
                  Ingest Source Notes
                </button>
              </div>
            </div>

            {/* Daily Challenge Component */}
            <DailyChallenge onChallengeCompleted={fetchUserStats} />

            {/* Quick Index Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveTab('quiz')}
                className="bg-white border border-[#E4E1D8] border-l-2 border-l-[#3D5A45] p-5 cursor-pointer hover:bg-[#FAFAF8] transition-colors space-y-2"
              >
                <div className="text-[11px] font-mono text-[#3D5A45]">01 / REPETITION</div>
                <h3 className="font-serif text-base font-semibold text-[#1C1B19]">
                  SM-2 Spaced Repetition
                </h3>
                <p className="text-xs text-[#6B6A63] leading-relaxed">
                  Calculates review intervals based on recall grades (0-5) to reinforce synaptic memory retention over time.
                </p>
                <div className="text-xs font-mono text-[#3D5A45] pt-1">
                  Start Quiz →
                </div>
              </div>

              <div
                onClick={() => setActiveTab('graph')}
                className="bg-white border border-[#E4E1D8] border-l-2 border-l-[#3D5A45] p-5 cursor-pointer hover:bg-[#FAFAF8] transition-colors space-y-2"
              >
                <div className="text-[11px] font-mono text-[#3D5A45]">02 / TOPOLOGY</div>
                <h3 className="font-serif text-base font-semibold text-[#1C1B19]">
                  Knowledge Graph
                </h3>
                <p className="text-xs text-[#6B6A63] leading-relaxed">
                  Maps extracted concepts, entities, and semantic relationships as an interactive node-and-edge network.
                </p>
                <div className="text-xs font-mono text-[#3D5A45] pt-1">
                  View Graph →
                </div>
              </div>

              <div
                onClick={() => setActiveTab('entities')}
                className="bg-white border border-[#E4E1D8] border-l-2 border-l-[#3D5A45] p-5 cursor-pointer hover:bg-[#FAFAF8] transition-colors space-y-2"
              >
                <div className="text-[11px] font-mono text-[#3D5A45]">03 / INDEX</div>
                <h3 className="font-serif text-base font-semibold text-[#1C1B19]">
                  Entity & Path Discovery
                </h3>
                <p className="text-xs text-[#6B6A63] leading-relaxed">
                  Inspect entities ranked by importance score and compute shortest connection paths across your notes.
                </p>
                <div className="text-xs font-mono text-[#3D5A45] pt-1">
                  Browse Index →
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QUIZ TAB */}
        {activeTab === 'quiz' && (
          <QuizInterface onQuizCompleted={fetchUserStats} />
        )}

        {/* KNOWLEDGE GRAPH TAB */}
        {activeTab === 'graph' && (
          <KnowledgeGraphView />
        )}

        {/* ADD CONTENT TAB */}
        {activeTab === 'add-content' && (
          <ContentUpload
            onSuccess={() => {
              fetchUserStats();
              setActiveTab('graph');
            }}
          />
        )}

        {/* ENTITIES TAB */}
        {activeTab === 'entities' && (
          <EntityBrowser />
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'progress' && (
          <ProgressDashboard />
        )}

        {/* SOURCES TAB */}
        {activeTab === 'sources' && (
          <SourcesList />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E4E1D8] py-4 text-center text-xs text-[#6B6A63] font-mono">
        <div className="max-w-5xl mx-auto px-4">
          Knowledge Notebook • Pattern Entity Matching, TF-IDF + TextRank, SM-2, Online SGD Logistic Regression • SQLite Local Persistence
        </div>
      </footer>
    </div>
  );
}

