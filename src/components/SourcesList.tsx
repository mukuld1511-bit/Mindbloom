import React, { useState, useEffect } from 'react';
import { Source } from '../types';
import { BookOpen, Link as LinkIcon, FileText, Clock, RefreshCw, Layers, HelpCircle } from 'lucide-react';

export const SourcesList: React.FC = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSources = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/learn/sources');
      const data = await res.json();
      setSources(data);
      if (data.length > 0 && !selectedSource) {
        setSelectedSource(data[0]);
      }
    } catch (err) {
      console.error('Failed to load sources:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-[#FAFAF8] border border-[#E4E1D8] rounded p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-[#3D5A45]/10 text-[#3D5A45] rounded">
              <BookOpen className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-[#1C1B19]">Ingested Knowledge Sources</h2>
          </div>
          <p className="text-sm text-[#6B6A63] mt-1">
            Articles, text snippets, and papers processed into your personal knowledge graph.
          </p>
        </div>

        <button
          onClick={fetchSources}
          className="p-2.5 bg-[#FAFAF8] border border-[#E4E1D8] hover:bg-[#F4F3EE] text-[#1C1B19] rounded text-xs font-semibold flex items-center space-x-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Source Items List (1 col) */}
        <div className="bg-[#FAFAF8] border border-[#E4E1D8] rounded p-5 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#6B6A63] block pb-1 border-b border-[#E4E1D8]">
            Source Index ({sources.length})
          </span>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="text-center text-[#6B6A63] py-12 text-xs">Loading sources...</div>
            ) : sources.length > 0 ? (
              sources.map((src) => {
                const isSelected = selectedSource?.id === src.id;
                return (
                  <button
                    key={src.id}
                    onClick={() => setSelectedSource(src)}
                    className={`w-full text-left p-3.5 rounded border text-xs transition-all space-y-2 ${
                      isSelected
                        ? 'bg-[#3D5A45]/10 border-[#3D5A45] text-[#3D5A45] font-semibold'
                        : 'bg-[#FAFAF8] border-[#E4E1D8] text-[#1C1B19] hover:bg-[#F4F3EE]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-sm line-clamp-1">{src.title}</span>
                      {src.url ? <LinkIcon className="w-3.5 h-3.5 text-[#3D5A45] shrink-0 ml-2" /> : <FileText className="w-3.5 h-3.5 text-[#6B6A63] shrink-0 ml-2" />}
                    </div>
                    <div className="flex items-center space-x-3 text-[10px] text-[#6B6A63]">
                      <span>{src.entitiesCount} entities</span>
                      <span>•</span>
                      <span>{src.questionsCount} questions</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center text-[#6B6A63] py-12 text-xs">No knowledge sources ingested yet.</div>
            )}
          </div>
        </div>

        {/* Source Content Preview Panel (2 cols) */}
        <div className="md:col-span-2 bg-[#FAFAF8] border border-[#E4E1D8] rounded p-6 space-y-6">
          {selectedSource ? (
            <>
              <div className="flex items-start justify-between pb-4 border-b border-[#E4E1D8]">
                <div>
                  <h3 className="text-2xl font-bold text-[#1C1B19]">{selectedSource.title}</h3>
                  {selectedSource.url && (
                    <a
                      href={selectedSource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#3D5A45] hover:underline flex items-center space-x-1 mt-1"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{selectedSource.url}</span>
                    </a>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-xs text-[#6B6A63] font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(selectedSource.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Stats badges */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#FAFAF8] p-3 rounded border border-[#E4E1D8] text-center">
                  <span className="text-[10px] text-[#6B6A63] block">Facts Extracted</span>
                  <span className="text-lg font-bold text-[#1C1B19]">{selectedSource.factsCount}</span>
                </div>
                <div className="bg-[#FAFAF8] p-3 rounded border border-[#E4E1D8] text-center">
                  <span className="text-[10px] text-[#6B6A63] block">Entities Found</span>
                  <span className="text-lg font-bold text-[#3D5A45]">{selectedSource.entitiesCount}</span>
                </div>
                <div className="bg-[#FAFAF8] p-3 rounded border border-[#E4E1D8] text-center">
                  <span className="text-[10px] text-[#6B6A63] block">Questions Built</span>
                  <span className="text-lg font-bold text-[#3D5A45]">{selectedSource.questionsCount}</span>
                </div>
              </div>

              {/* Raw Content Snippet */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B6A63] block">
                  Source Content Text
                </span>
                <div className="bg-[#FAFAF8] p-4 rounded border border-[#E4E1D8] text-xs text-[#1C1B19] font-mono leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap">
                  {selectedSource.content}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-[#6B6A63] py-20 text-sm">
              Select a source from the index to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
