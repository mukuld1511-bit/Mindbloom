import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { KnowledgeGraphView } from './components/KnowledgeGraphView';
import { QuizView } from './components/QuizView';
import { NotebookIngestView } from './components/NotebookIngestView';
import { LearningCurveView } from './components/LearningCurveView';
import { ExtensionGuideView } from './components/ExtensionGuideView';
import { SystemStats, KnowledgeGraphData, Question, Source, RetentionProjection } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('graph');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
  const [dueQuestions, setDueQuestions] = useState<Question[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [projectionData, setProjectionData] = useState<RetentionProjection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Data Fetching Handlers
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn('Failed to fetch stats:', e);
    }
  }, []);

  const fetchKnowledgeGraph = useCallback(async () => {
    try {
      const res = await fetch('/api/knowledge-graph');
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
      }
    } catch (e) {
      console.warn('Failed to fetch knowledge graph:', e);
    }
  }, []);

  const fetchDueQuestions = useCallback(async () => {
    try {
      const res = await fetch('/api/quiz/due');
      if (res.ok) {
        const data = await res.json();
        setDueQuestions(data);
      }
    } catch (e) {
      console.warn('Failed to fetch due questions:', e);
    }
  }, []);

  const fetchSources = useCallback(async () => {
    try {
      const res = await fetch('/api/sources');
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (e) {
      console.warn('Failed to fetch sources:', e);
    }
  }, []);

  const fetchProjections = useCallback(async () => {
    try {
      const res = await fetch('/api/predictions/learning-curve');
      if (res.ok) {
        const data = await res.json();
        setProjectionData(data);
      }
    } catch (e) {
      console.warn('Failed to fetch projections:', e);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchKnowledgeGraph(),
      fetchDueQuestions(),
      fetchSources(),
      fetchProjections()
    ]);
    setLoading(false);
  }, [fetchStats, fetchKnowledgeGraph, fetchDueQuestions, fetchSources, fetchProjections]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Actions
  const handleIngestContent = async (title: string, content: string, sourceUrl: string) => {
    const res = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, sourceUrl })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to ingest content');
    }
    const data = await res.json();
    await refreshAll();
    return data;
  };

  const handleSubmitQuizAnswer = async (questionId: number, grade: number, userAnswer: string) => {
    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: questionId, performance_grade: grade, user_answer: userAnswer })
    });
    if (!res.ok) throw new Error('Failed to submit quiz grade');
    const data = await res.json();
    await fetchStats();
    return data;
  };

  const handleTrainModels = async () => {
    const res = await fetch('/api/ml/train', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to retrain models');
    const data = await res.json();
    await refreshAll();
    return data;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1C1B19] font-sans antialiased selection:bg-[#EBF2EC]">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} stats={stats} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && !stats ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#3D5A45] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-[#6B6A63]">Loading MindBloom ML Workspace...</p>
          </div>
        ) : (
          <>
            {activeTab === 'graph' && (
              <KnowledgeGraphView graphData={graphData} onRefresh={refreshAll} />
            )}

            {activeTab === 'quiz' && (
              <QuizView
                questions={dueQuestions}
                onSubmitAnswer={handleSubmitQuizAnswer}
                onRefresh={refreshAll}
              />
            )}

            {activeTab === 'ingest' && (
              <NotebookIngestView
                sources={sources}
                onIngestContent={handleIngestContent}
                onRefresh={refreshAll}
              />
            )}

            {activeTab === 'analytics' && (
              <LearningCurveView
                projectionData={projectionData}
                onTrainModels={handleTrainModels}
                onRefresh={refreshAll}
              />
            )}

            {activeTab === 'extension' && <ExtensionGuideView />}
          </>
        )}
      </main>
    </div>
  );
}
