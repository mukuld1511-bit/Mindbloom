import React from 'react';
import { Sprout, Network, BrainCircuit, BookOpen, TrendingUp, Puzzle, Activity } from 'lucide-react';
import { SystemStats } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  stats: SystemStats | null;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, stats }) => {
  return (
    <header className="border-b border-[#E4E1D8] bg-[#FAFAF8] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 border-b border-[#E4E1D8]">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#3D5A45] flex items-center justify-center text-white shadow-sm">
              <Sprout className="w-5 h-5 text-[#E1EBE2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl font-bold text-[#1C1B19] tracking-tight">MindBloom</h1>
                <span className="text-[10px] font-sans font-semibold uppercase px-2 py-0.5 rounded bg-[#EBF2EC] text-[#3D5A45] border border-[#D2E2D5]">
                  Smart Notes
                </span>
              </div>
              <p className="text-xs text-[#6B6A63] font-sans">
                My Idea Network & Study Flashcards
              </p>
            </div>
          </div>

          {/* User Stats Bar */}
          <div className="hidden md:flex items-center gap-4 font-mono text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#F3F2EE] border border-[#E4E1D8]">
              <BookOpen className="w-3.5 h-3.5 text-[#3D5A45]" />
              <span className="text-[#6B6A63]">Notes Captured:</span>
              <strong className="text-[#1C1B19]">{stats?.sources_count ?? 0}</strong>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#EBF2EC] border border-[#D2E2D5] text-[#3D5A45]">
              <BrainCircuit className="w-3.5 h-3.5" />
              <span>Flashcards Due:</span>
              <strong className="font-bold">{stats?.due_questions_count ?? 0}</strong>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-4 py-2 overflow-x-auto">
          {[
            { id: 'graph', label: 'My Idea Network', icon: Network },
            { id: 'quiz', label: 'Review Flashcards', icon: BrainCircuit, badge: stats?.due_questions_count },
            { id: 'ingest', label: 'Capture Knowledge', icon: BookOpen },
            { id: 'analytics', label: 'My Progress', icon: TrendingUp },
            { id: 'extension', label: 'Chrome Extension', icon: Puzzle }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#3D5A45] text-white shadow-sm font-semibold'
                    : 'text-[#6B6A63] hover:text-[#1C1B19] hover:bg-[#F3F2EE]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isActive ? 'bg-white text-[#3D5A45]' : 'bg-[#EBF2EC] text-[#3D5A45]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
