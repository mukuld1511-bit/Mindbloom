import React from 'react';
import { BookOpen, UserStats } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userStats: any;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, userStats }) => {
  const navItems = [
    { id: 'dashboard', label: 'Notebook' },
    { id: 'quiz', label: 'Spaced Quiz', badge: userStats?.dueTodayCount },
    { id: 'graph', label: 'Knowledge Graph' },
    { id: 'add-content', label: 'Ingest Notes' },
    { id: 'entities', label: 'Entity Index' },
    { id: 'progress', label: 'Analytics' },
    { id: 'sources', label: 'Sources' }
  ];

  return (
    <header className="bg-white border-b border-[#E4E1D8] sticky top-0 z-40 text-[#1C1B19]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand / Title */}
          <div 
            className="flex items-baseline space-x-2.5 cursor-pointer group"
            onClick={() => setActiveTab('dashboard')}
          >
            <span className="font-serif text-lg font-semibold text-[#1C1B19] tracking-tight">
              Knowledge Notebook
            </span>
            <span className="text-[11px] text-[#6B6A63] font-mono hidden sm:inline">
              / SM-2 & ML
            </span>
          </div>

          {/* Desktop Table of Contents Nav */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav_btn_${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors rounded ${
                    isActive
                      ? 'bg-[#3D5A45]/10 text-[#3D5A45] font-semibold border border-[#3D5A45]/20'
                      : 'text-[#6B6A63] hover:text-[#1C1B19] hover:bg-[#F5F4EE]'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-mono rounded bg-[#3D5A45] text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick User Stats Badge */}
          <div className="flex items-center space-x-3 text-xs font-mono text-[#6B6A63]">
            <div className="flex items-center space-x-2 bg-[#FAFAF8] border border-[#E4E1D8] px-2.5 py-1 rounded">
              <span>{userStats?.streakDays || 0}d streak</span>
              <span className="text-[#E4E1D8]">|</span>
              <span className="text-[#3D5A45] font-medium">{userStats?.masteryPercentage || 0}% recall</span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Scrollbar */}
        <div className="md:hidden flex overflow-x-auto space-x-1 py-1.5 border-t border-[#E4E1D8] no-scrollbar">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#3D5A45]/10 text-[#3D5A45] border border-[#3D5A45]/20 font-semibold'
                    : 'text-[#6B6A63] bg-[#FAFAF8] hover:bg-[#F5F4EE]'
                }`}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1 px-1 py-0.2 text-[10px] font-mono bg-[#3D5A45] text-white rounded">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

