import React, { useState, useMemo } from 'react';
import { KnowledgeGraphData, GraphNode, GraphEdge } from '../types';
import { Network, Search, Filter, Compass, ArrowRight, Info, Layers } from 'lucide-react';

interface KnowledgeGraphViewProps {
  graphData: KnowledgeGraphData | null;
  onRefresh: () => void;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({ graphData, onRefresh }) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [pathSource, setPathSource] = useState<string>('');
  const [pathTarget, setPathTarget] = useState<string>('');
  const [pathResult, setPathResult] = useState<string[]>([]);

  const nodes = graphData?.nodes || [];
  const edges = graphData?.edges || [];

  const entityTypes = useMemo(() => {
    const types = new Set<string>();
    nodes.forEach(n => types.add(n.type));
    return Array.from(types);
  }, [nodes]);

  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      const matchesSearch = n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            n.context.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'ALL' || n.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [nodes, searchQuery, typeFilter]);

  const relatedEdges = useMemo(() => {
    if (!selectedNode) return [];
    return edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id);
  }, [edges, selectedNode]);

  const handleFindPath = () => {
    if (!pathSource || !pathTarget || pathSource === pathTarget) return;

    // Simple BFS shortest path solver on graphData
    const adj = new Map<string, string[]>();
    edges.forEach(e => {
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source)!.push(e.target);
    });

    const queue: string[][] = [[pathSource]];
    const visited = new Set<string>([pathSource]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const curr = path[path.length - 1];

      if (curr === pathTarget) {
        setPathResult(path);
        return;
      }

      const neighbors = adj.get(curr) || [];
      for (const nextNode of neighbors) {
        if (!visited.has(nextNode)) {
          visited.add(nextNode);
          queue.push([...path, nextNode]);
        }
      }
    }

    setPathResult([]);
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'PRINCIPLE': return 'bg-[#EBF2EC] text-[#3D5A45] border-[#D2E2D5]';
      case 'METHOD': return 'bg-[#E8F1F5] text-[#2C5282] border-[#C3D9E8]';
      case 'TOPIC': return 'bg-[#F2EFE9] text-[#744210] border-[#E2D9CC]';
      case 'RESULT': return 'bg-[#F3E8EE] text-[#702459] border-[#E8CCD8]';
      default: return 'bg-[#F3F2EE] text-[#4A4943] border-[#E4E1D8]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="bg-[#FFFFFF] border border-[#E4E1D8] rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6A63]" />
          <input
            type="text"
            placeholder="Search entities or context..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-[#E4E1D8] rounded-lg text-xs bg-[#FAFAF8] focus:outline-none focus:border-[#3D5A45]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <Filter className="w-4 h-4 text-[#6B6A63]" />
          <span className="text-xs text-[#6B6A63]">Type:</span>
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              typeFilter === 'ALL'
                ? 'bg-[#3D5A45] text-white border-[#3D5A45]'
                : 'bg-[#FAFAF8] text-[#6B6A63] border-[#E4E1D8] hover:bg-[#F3F2EE]'
            }`}
          >
            All ({nodes.length})
          </button>
          {entityTypes.map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                typeFilter === type
                  ? 'bg-[#3D5A45] text-white border-[#3D5A45]'
                  : 'bg-[#FAFAF8] text-[#6B6A63] border-[#E4E1D8] hover:bg-[#F3F2EE]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Interactive Graph Canvas / Node Grid */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E4E1D8] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E4E1D8] pb-3">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-[#3D5A45]" />
              <h2 className="font-serif font-semibold text-base text-[#1C1B19]">Knowledge Network</h2>
            </div>
            <span className="font-mono text-xs text-[#6B6A63]">
              Showing {filteredNodes.length} of {nodes.length} concepts
            </span>
          </div>

          {/* Graphical Node Cards Visualizer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
            {filteredNodes.map(node => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#EBF2EC] border-[#3D5A45] shadow-sm'
                      : 'bg-[#FAFAF8] border-[#E4E1D8] hover:border-[#3D5A45] hover:bg-[#F3F2EE]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-serif font-medium text-sm text-[#1C1B19] leading-snug">{node.label}</h3>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${getTypeBadgeColor(node.type)}`}>
                      {node.type}
                    </span>
                  </div>

                  <p className="text-xs text-[#6B6A63] line-clamp-2 mb-2 font-sans">
                    {node.context}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#6B6A63]">
                    <span>Importance: {node.importance}</span>
                    <span className="text-[#3D5A45]">Inspect →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Inspector & Shortest Path Solver */}
        <div className="space-y-6">
          {/* Node Inspector Panel */}
          <div className="bg-[#FFFFFF] border border-[#E4E1D8] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E4E1D8] pb-3">
              <Info className="w-4 h-4 text-[#3D5A45]" />
              <h3 className="font-serif font-semibold text-sm text-[#1C1B19]">Entity Inspector</h3>
            </div>

            {selectedNode ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-serif font-bold text-base text-[#1C1B19]">{selectedNode.label}</h4>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase ${getTypeBadgeColor(selectedNode.type)}`}>
                      {selectedNode.type}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B6A63] font-mono">Importance Score: {selectedNode.importance}</p>
                </div>

                <div className="bg-[#FAFAF8] border border-[#E4E1D8] p-3 rounded-lg">
                  <h5 className="text-[11px] font-semibold text-[#1C1B19] uppercase tracking-wider mb-1">Extracted Context</h5>
                  <p className="text-xs text-[#1C1B19] leading-relaxed font-sans">{selectedNode.context}</p>
                </div>

                <div>
                  <h5 className="text-[11px] font-semibold text-[#1C1B19] uppercase tracking-wider mb-2">Connected Relationships ({relatedEdges.length})</h5>
                  {relatedEdges.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {relatedEdges.map(edge => (
                        <div key={edge.id} className="text-xs p-2 bg-[#F3F2EE] rounded border border-[#E4E1D8] font-mono flex items-center justify-between">
                          <span>{edge.source} <strong className="text-[#3D5A45]">[{edge.relation}]</strong> {edge.target}</span>
                          <span className="text-[10px] text-[#6B6A63]">{(edge.confidence * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#6B6A63] italic">No direct connections recorded.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#6B6A63] italic py-8 text-center">
                Click any concept node on the left to view detailed context and network relations.
              </p>
            )}
          </div>

          {/* NetworkX Shortest Path Finder */}
          <div className="bg-[#FFFFFF] border border-[#E4E1D8] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E4E1D8] pb-3">
              <Compass className="w-4 h-4 text-[#3D5A45]" />
              <h3 className="font-serif font-semibold text-sm text-[#1C1B19]">Shortest Path Finder</h3>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-[#6B6A63] block mb-1">From Node</label>
                  <select
                    value={pathSource}
                    onChange={(e) => setPathSource(e.target.value)}
                    className="w-full text-xs p-2 border border-[#E4E1D8] rounded bg-[#FAFAF8]"
                  >
                    <option value="">Select source...</option>
                    {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-[#6B6A63] block mb-1">To Node</label>
                  <select
                    value={pathTarget}
                    onChange={(e) => setPathTarget(e.target.value)}
                    className="w-full text-xs p-2 border border-[#E4E1D8] rounded bg-[#FAFAF8]"
                  >
                    <option value="">Select target...</option>
                    {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                  </select>
                </div>
              </div>

              <button
                onClick={handleFindPath}
                disabled={!pathSource || !pathTarget}
                className="w-full py-2 bg-[#3D5A45] text-white rounded-lg text-xs font-semibold hover:bg-[#2F4736] disabled:bg-[#A3B5A8] transition-colors"
              >
                Find Network Path
              </button>

              {pathResult.length > 0 && (
                <div className="p-3 bg-[#EBF2EC] border border-[#D2E2D5] rounded-lg">
                  <span className="text-[11px] font-semibold text-[#3D5A45] block mb-1">Shortest Path Found ({pathResult.length - 1} hops):</span>
                  <div className="flex items-center flex-wrap gap-1 text-xs font-mono text-[#1C1B19]">
                    {pathResult.map((step, idx) => (
                      <React.Fragment key={idx}>
                        <span className="bg-white px-2 py-0.5 rounded border border-[#D2E2D5]">{step}</span>
                        {idx < pathResult.length - 1 && <ArrowRight className="w-3 h-3 text-[#3D5A45]" />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
