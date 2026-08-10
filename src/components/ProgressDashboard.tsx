import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts';
import { UserStats, PerformancePrediction } from '../types';

export const ProgressDashboard: React.FC = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [prediction, setPrediction] = useState<PerformancePrediction | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [statsRes, progressRes, predictRes] = await Promise.all([
        fetch('/api/quiz/stats'),
        fetch('/api/learn/progress'),
        fetch('/api/quiz/predict')
      ]);

      const statsJson = await statsRes.json();
      const progressJson = await progressRes.json();
      const predictJson = await predictRes.json();

      setStats(statsJson);
      setProgressData(progressJson);
      setPrediction(predictJson);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E4E1D8] p-12 text-center text-[#6B6A63] font-mono text-xs max-w-4xl mx-auto">
        <span>Computing regression performance predictions & time-series metrics...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E4E1D8] border-l-2 border-l-[#3D5A45] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono text-[#6B6A63] uppercase tracking-wider block">
            Memory Analytics
          </span>
          <h2 className="font-serif text-xl font-semibold text-[#1C1B19] mt-0.5">
            Learning Analytics & Retention Models
          </h2>
          <p className="text-xs text-[#6B6A63] mt-1">
            Tracking recall accuracy, SM-2 interval progress, and Ebbinghaus forgetting projections.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="px-3 py-1.5 bg-[#FAFAF8] hover:bg-[#F4F3EE] text-[#1C1B19] border border-[#E4E1D8] rounded text-xs font-mono transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E4E1D8] p-4 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#6B6A63] block">Overall Recall Accuracy</span>
          <div className="font-serif text-2xl font-semibold text-[#1C1B19]">
            {Math.round((stats?.accuracyRate || 0) * 100)}%
          </div>
          <span className="text-[11px] font-mono text-[#3D5A45] block">
            {stats?.totalReviews || 0} total reviews
          </span>
        </div>

        <div className="bg-white border border-[#E4E1D8] p-4 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#6B6A63] block">Mastery Rating</span>
          <div className="font-serif text-2xl font-semibold text-[#3D5A45]">
            {stats?.masteryPercentage || 0}%
          </div>
          <span className="text-[11px] text-[#6B6A63] block">
            Practitioner Level
          </span>
        </div>

        <div className="bg-white border border-[#E4E1D8] p-4 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#6B6A63] block">Knowledge Nodes</span>
          <div className="font-serif text-2xl font-semibold text-[#1C1B19]">
            {stats?.totalEntities || 0}
          </div>
          <span className="text-[11px] font-mono text-[#6B6A63] block">
            {stats?.totalRelationships || 0} relations
          </span>
        </div>

        <div className="bg-white border border-[#E4E1D8] p-4 space-y-1">
          <span className="text-[10px] font-mono uppercase text-[#6B6A63] block">Items Due Today</span>
          <div className="font-serif text-2xl font-semibold text-[#3D5A45]">
            {stats?.dueTodayCount || 0}
          </div>
          <span className="text-[11px] font-mono text-[#6B6A63] block">
            SM-2 review queue
          </span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retention & Accuracy Trend */}
        <div className="bg-white border border-[#E4E1D8] p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#E4E1D8] pb-2">
            <h3 className="font-serif text-base font-semibold text-[#1C1B19]">7-Day Recall Accuracy Trend</h3>
            <span className="text-[10px] font-mono text-[#6B6A63] uppercase">Accuracy %</span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E1D8" opacity={0.6} />
                <XAxis dataKey="date" stroke="#6B6A63" fontSize={10} />
                <YAxis domain={[0, 100]} stroke="#6B6A63" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E4E1D8', borderRadius: '4px', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="accuracy" stroke="#3D5A45" strokeWidth={2} fill="#3D5A45" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Projected Ebbinghaus Forgetting Curve */}
        <div className="bg-white border border-[#E4E1D8] p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#E4E1D8] pb-2">
            <h3 className="font-serif text-base font-semibold text-[#1C1B19]">Projected Memory Decay (30 Days)</h3>
            <span className="text-[10px] font-mono text-[#6B6A63] uppercase">Retention %</span>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={prediction?.learningCurve || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E1D8" opacity={0.6} />
                <XAxis dataKey="day" stroke="#6B6A63" fontSize={10} />
                <YAxis domain={[0, 100]} stroke="#6B6A63" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E4E1D8', borderRadius: '4px', fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="predictedRetention" stroke="#1C1B19" strokeWidth={2} dot={{ fill: '#3D5A45', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Model Recommendation Banner */}
      {prediction?.recommendation && (
        <div className="bg-white border border-[#E4E1D8] border-l-2 border-l-[#3D5A45] p-4 flex items-start space-x-3 text-xs">
          <div>
            <span className="font-mono text-[10px] text-[#3D5A45] uppercase tracking-wider block font-semibold">
              Performance Model Output
            </span>
            <p className="text-xs text-[#1C1B19] mt-0.5 leading-relaxed">
              {prediction.recommendation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

