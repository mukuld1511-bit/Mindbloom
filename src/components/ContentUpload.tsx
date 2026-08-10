import React, { useState } from 'react';

interface ContentUploadProps {
  onSuccess: () => void;
}

export const ContentUpload: React.FC<ContentUploadProps> = ({ onSuccess }) => {
  const [activeMode, setActiveMode] = useState<'text' | 'url'>('text');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const presets = [
    {
      label: 'Neuroscience & Memory',
      title: 'Neuroscience of Synaptic Plasticity',
      text: `Synaptic plasticity is the ability of synapses to strengthen or weaken over time, in response to increases or decreases in their activity. Long-term potentiation (LTP) is a persistent strengthening of synapses based on recent patterns of activity. LTP was discovered by Terje Lømo in the rabbit hippocampus. Memories are thought to be encoded by modification of synaptic strength. NMDA receptors play a crucial role in signal transmission and cognitive learning processes.`
    },
    {
      label: 'Machine Learning - Transformers',
      title: 'Attention Is All You Need Architecture',
      text: `The Transformer is a deep learning architecture introduced in 2017 by Ashish Vaswani et al. It relies entirely on self-attention mechanisms to compute representations of its input and output without using sequence-aligned RNNs or convolution. The Transformer architecture comprises an Encoder and a Decoder with Multi-Head Attention. Multi-Head Attention allows the model to jointly attend to information from different representation subspaces at different positions.`
    },
    {
      label: 'Quantum Mechanics Basics',
      title: 'Principles of Quantum Superposition',
      text: `Quantum superposition is a fundamental principle of quantum mechanics. It states that, much like waves in classical physics, any two or more quantum states can be added together ("superposed") and the result will be another valid quantum state. Erwin Schrödinger formulated the thought experiment known as Schrödinger's Cat to illustrate the paradoxes of wave function collapse. Quantum Entanglement occurs when pairs of particles interact in ways such that the quantum state of each particle cannot be described independently.`
    }
  ];

  const handleApplyPreset = (preset: typeof presets[0]) => {
    setTitle(preset.title);
    setText(preset.text);
    setActiveMode('text');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setStatusMessage(null);

    const contentText = activeMode === 'text' ? text : `Article imported from ${url}. ${title}`;

    try {
      const res = await fetch('/api/content/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentText,
          title: title || (activeMode === 'url' ? 'Web Article' : 'Pasted Text'),
          url: activeMode === 'url' ? url : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process content');

      setStatusMessage({
        type: 'success',
        text: `Extracted ${data.entitiesCount} entities, ${data.keywordsCount} keywords, ${data.relationshipsCount} relationships, and generated ${data.questionsCount} questions!`
      });

      setText('');
      setTitle('');
      setUrl('');
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error processing content' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-[#E4E1D8] border-l-2 border-l-[#3D5A45] p-6 space-y-3">
        <div className="space-y-1">
          <span className="text-[11px] font-mono text-[#6B6A63] uppercase tracking-wider block">
            Ingestion Pipeline
          </span>
          <h2 className="font-serif text-xl font-semibold text-[#1C1B19]">
            Ingest Source Notes & Knowledge
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#6B6A63] leading-relaxed">
          Paste articles, lecture summaries, or notes. Extracts entities using local pattern-and-dictionary matching, no external API calls required. Keywords are ranked via TF-IDF & TextRank.
        </p>

        {/* Preset Chips */}
        <div className="pt-3 border-t border-[#E4E1D8]">
          <span className="text-[11px] font-mono text-[#6B6A63] block mb-2">
            Sample Note Presets:
          </span>
          <div className="flex flex-wrap gap-2">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="px-2.5 py-1 text-xs font-medium bg-[#FAFAF8] hover:bg-[#F4F3EE] text-[#3D5A45] border border-[#E4E1D8] rounded transition-colors"
              >
                + {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white border border-[#E4E1D8] p-6 space-y-4">
        <div className="flex border-b border-[#E4E1D8] space-x-6 text-xs font-mono mb-4">
          <button
            type="button"
            onClick={() => setActiveMode('text')}
            className={`pb-2.5 transition-colors border-b-2 ${
              activeMode === 'text'
                ? 'border-[#3D5A45] text-[#3D5A45] font-semibold'
                : 'border-transparent text-[#6B6A63] hover:text-[#1C1B19]'
            }`}
          >
            Raw Text / Notes
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('url')}
            className={`pb-2.5 transition-colors border-b-2 ${
              activeMode === 'url'
                ? 'border-[#3D5A45] text-[#3D5A45] font-semibold'
                : 'border-transparent text-[#6B6A63] hover:text-[#1C1B19]'
            }`}
          >
            URL Link
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-mono text-[#6B6A63] uppercase mb-1">
              Source Title
            </label>
            <input
              type="text"
              placeholder="e.g. Synaptic Plasticity & Memory"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-[#FAFAF8] border border-[#E4E1D8] rounded p-2.5 text-[#1C1B19] placeholder-[#6B6A63] focus:outline-none focus:border-[#3D5A45]"
            />
          </div>

          {activeMode === 'url' ? (
            <div>
              <label className="block text-[11px] font-mono text-[#6B6A63] uppercase mb-1">
                Article URL
              </label>
              <input
                type="url"
                placeholder="https://example.com/article"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full bg-[#FAFAF8] border border-[#E4E1D8] rounded p-2.5 text-[#1C1B19] placeholder-[#6B6A63] focus:outline-none focus:border-[#3D5A45]"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-mono text-[#6B6A63] uppercase mb-1">
                Content Text
              </label>
              <textarea
                rows={7}
                placeholder="Paste paragraph, paper summary, or study notes..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                className="w-full bg-[#FAFAF8] border border-[#E4E1D8] rounded p-3 text-[#1C1B19] placeholder-[#6B6A63] focus:outline-none focus:border-[#3D5A45] resize-none font-sans"
              />
            </div>
          )}

          {statusMessage && (
            <div
              className={`p-3 rounded border font-mono text-xs ${
                statusMessage.type === 'success'
                  ? 'bg-[#3D5A45]/10 border-[#3D5A45]/30 text-[#3D5A45]'
                  : 'bg-[#A23B3B]/10 border-[#A23B3B]/30 text-[#A23B3B]'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2.5 bg-[#3D5A45] hover:bg-[#2D4333] text-white font-medium rounded transition-colors disabled:opacity-50 text-xs"
            >
              {isProcessing ? 'Extracting & Processing...' : 'Process Knowledge Source'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

