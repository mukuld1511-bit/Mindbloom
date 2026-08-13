import React, { useState } from 'react';
import { Puzzle, Download, CheckCircle2, ArrowRight, Activity, Terminal } from 'lucide-react';

export const ExtensionGuideView: React.FC = () => {
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testing, setTesting] = useState(false);

  const handleTestBackend = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setTestResult({ status: 'ok', data });
    } catch (err: any) {
      setTestResult({ status: 'error', error: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Overview Banner */}
      <div className="bg-[#FFFFFF] border border-[#E4E1D8] rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-3 border-b border-[#E4E1D8] pb-4 justify-between flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#3D5A45] text-white flex items-center justify-center">
              <Puzzle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-[#1C1B19]">MindBloom Chrome Extension (Manifest V3)</h2>
              <p className="text-xs text-[#6B6A63] font-sans">
                Capture web articles, research papers, or highlighted text directly into your MindBloom local knowledge graph.
              </p>
            </div>
          </div>
          <a
            href="/api/extension/download"
            download="mindbloom-extension.zip"
            className="flex items-center gap-2 px-4 py-2 bg-[#3D5A45] text-white rounded-md text-sm font-semibold hover:bg-[#2F4736] transition-colors mt-4 sm:mt-0"
          >
            <Download className="w-4 h-4" />
            <span>Download .zip</span>
          </a>
        </div>

        {/* Step-by-Step Installation */}
        <div className="space-y-4 pt-2">
          <h3 className="font-serif font-semibold text-sm text-[#1C1B19]">How to Install in Chrome / Edge / Brave:</h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-sans text-xs">
            <div className="p-4 bg-[#FAFAF8] border border-[#E4E1D8] rounded-lg space-y-2">
              <span className="w-6 h-6 rounded-full bg-[#3D5A45] text-white flex items-center justify-center text-xs font-mono font-bold">1</span>
              <h4 className="font-semibold text-[#1C1B19]">Extract ZIP</h4>
              <p className="text-[#6B6A63] text-[11px] leading-relaxed">
                Download the extension zip file using the button above and extract its contents to a folder.
              </p>
            </div>
            <div className="p-4 bg-[#FAFAF8] border border-[#E4E1D8] rounded-lg space-y-2">
              <span className="w-6 h-6 rounded-full bg-[#3D5A45] text-white flex items-center justify-center text-xs font-mono font-bold">2</span>
              <h4 className="font-semibold text-[#1C1B19]">Open Extensions</h4>
              <p className="text-[#6B6A63] text-[11px] leading-relaxed">
                Navigate to <code className="bg-[#E4E1D8] px-1 py-0.5 rounded text-[10px]">chrome://extensions</code> in your browser address bar.
              </p>
            </div>

            <div className="p-4 bg-[#FAFAF8] border border-[#E4E1D8] rounded-lg space-y-2">
              <span className="w-6 h-6 rounded-full bg-[#3D5A45] text-white flex items-center justify-center text-xs font-mono font-bold">3</span>
              <h4 className="font-semibold text-[#1C1B19]">Developer Mode</h4>
              <p className="text-[#6B6A63] text-[11px] leading-relaxed">
                Toggle the <strong>Developer mode</strong> switch in the top-right corner of the extensions page.
              </p>
            </div>

            <div className="p-4 bg-[#FAFAF8] border border-[#E4E1D8] rounded-lg space-y-2">
              <span className="w-6 h-6 rounded-full bg-[#3D5A45] text-white flex items-center justify-center text-xs font-mono font-bold">4</span>
              <h4 className="font-semibold text-[#1C1B19]">Load Unpacked</h4>
              <p className="text-[#6B6A63] text-[11px] leading-relaxed">
                Click <strong>Load unpacked</strong> and select the folder you extracted in Step 1.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Backend Connection Diagnostic Panel */}
      <div className="bg-[#FFFFFF] border border-[#E4E1D8] rounded-xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="border-b border-[#E4E1D8] pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#3D5A45]" />
            <h3 className="font-serif font-semibold text-sm text-[#1C1B19]">Extension Backend Connectivity Test</h3>
          </div>
          <button
            onClick={handleTestBackend}
            disabled={testing}
            className="px-3.5 py-1.5 bg-[#3D5A45] text-white rounded-md text-xs font-semibold hover:bg-[#2F4736] transition-colors"
          >
            {testing ? 'Testing...' : 'Test /api/health Endpoint'}
          </button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-lg font-mono text-xs border ${
            testResult.status === 'ok' ? 'bg-[#EBF2EC] border-[#D2E2D5] text-[#3D5A45]' : 'bg-[#FDF2F2] border-[#A23B3B] text-[#A23B3B]'
          }`}>
            {testResult.status === 'ok' ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Backend Server Ready for Chrome Extension!</span>
                </div>
                <p className="text-[11px] opacity-90">Service: {testResult.data.service} (v{testResult.data.version})</p>
              </div>
            ) : (
              <div>Connection error: {testResult.error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
