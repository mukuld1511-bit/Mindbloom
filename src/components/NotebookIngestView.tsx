import React, { useState } from 'react';
import { Source } from '../types';
import { BookOpen, Sparkles, Link, Check, FileText, ArrowRight } from 'lucide-react';

interface NotebookIngestViewProps {
  sources: Source[];
  onIngestContent: (title: string, content: string, url: string) => Promise<any>;
  onRefresh: () => void;
}

export const NotebookIngestView: React.FC<NotebookIngestViewProps> = ({ sources, onIngestContent, onRefresh }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || loading) return;

    setLoading(true);
    setErrorMsg('');
    setLastResult(null);

    try {
      const res = await onIngestContent(title, content, url);
      setLastResult(res);
      setTitle('');
      setContent('');
      setUrl('');
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to analyze content.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Article Capture Notebook Form */}
      <div className="bg-[#FFFFFF] border border-[#E4E1D8] rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="border-b border-[#E4E1D8] pb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[#3D5A45]" />
            <h2 className="font-serif font-bold text-lg text-[#1C1B19]">MindBloom Article Ingestion Notebook</h2>
          </div>
          <p className="text-xs text-[#6B6A63] mt-1 font-sans">
            Paste any article, notes, or paper text below. The local ML engine will execute spaCy NER, scikit-learn TF-IDF & NetworkX TextRank, and generate SM-2 questions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[#1C1B19] block mb-1">Article Title (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Cognitive Load Theory in Deep Learning"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2.5 border border-[#E4E1D8] rounded-lg text-xs bg-[#FAFAF8] focus:outline-none focus:border-[#3D5A45]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1C1B19] block mb-1">Source URL (Optional)</label>
              <div className="relative">
                <Link className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6A63]" />
                <input
                  type="url"
                  placeholder="https://arxiv.org/abs/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 border border-[#E4E1D8] rounded-lg text-xs bg-[#FAFAF8] focus:outline-none focus:border-[#3D5A45]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#1C1B19] block mb-1">Text Content *</label>
            <textarea
              rows={6}
              placeholder="Paste main body text or study material here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="w-full p-3 border border-[#E4E1D8] rounded-lg text-xs sm:text-sm bg-[#FAFAF8] focus:outline-none focus:border-[#3D5A45] font-sans leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="w-full py-3 bg-[#3D5A45] text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-[#2F4736] disabled:bg-[#A3B5A8] transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Running Local ML Pipelines...' : 'Ingest & Build Knowledge Graph'}</span>
          </button>
        </form>

        {/* Results Banner */}
        {lastResult && (
          <div className="p-4 bg-[#EBF2EC] border border-[#D2E2D5] rounded-lg space-y-2">
            <div className="flex items-center gap-2 font-semibold text-xs text-[#3D5A45]">
              <Check className="w-4 h-4" />
              <span>Article Processed Successfully!</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs text-[#1C1B19] pt-2 border-t border-[#D2E2D5]">
              <div>Keywords: <strong>{lastResult.keywords_count}</strong></div>
              <div>Entities: <strong>{lastResult.entities_count}</strong></div>
              <div>Relations: <strong>{lastResult.relationships_count}</strong></div>
              <div>Questions: <strong>{lastResult.questions_generated}</strong></div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-[#FDF2F2] border border-[#A23B3B] text-[#A23B3B] text-xs rounded-lg">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Previously Ingested Notebook Sources */}
      <div className="bg-[#FFFFFF] border border-[#E4E1D8] rounded-xl p-6 space-y-4">
        <div className="border-b border-[#E4E1D8] pb-3 flex items-center justify-between">
          <h3 className="font-serif font-bold text-base text-[#1C1B19]">Notebook Sources ({sources.length})</h3>
          <span className="text-xs font-mono text-[#6B6A63]">Historical Ingest Log</span>
        </div>

        <div className="space-y-3">
          {sources.map(src => (
            <div key={src.id} className="p-4 rounded-lg bg-[#FAFAF8] border border-[#E4E1D8] space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#3D5A45]" />
                  <h4 className="font-serif font-semibold text-sm text-[#1C1B19]">{src.title}</h4>
                </div>
                {src.source_url && (
                  <a
                    href={src.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-mono text-[#3D5A45] hover:underline flex items-center gap-1"
                  >
                    Source Link ↗
                  </a>
                )}
              </div>

              <p className="text-xs text-[#6B6A63] font-sans line-clamp-2 leading-relaxed">
                {src.content}
              </p>

              <div className="flex items-center gap-4 text-[11px] font-mono text-[#6B6A63] pt-1">
                <span>Entities: {src.entities_count ?? 0}</span>
                <span>Questions: {src.questions_count ?? 0}</span>
                <span>Created: {src.created_at ? new Date(src.created_at).toLocaleDateString() : 'Today'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
