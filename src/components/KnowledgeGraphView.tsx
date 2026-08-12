import React, { useState, useMemo, useRef, useCallback } from 'react';
import { KnowledgeGraphData, GraphNode, GraphEdge } from '../types';
import { Network, Search, Filter, Info } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';

interface KnowledgeGraphViewProps {
  graphData: KnowledgeGraphData | null;
  onRefresh: () => void;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({ graphData, onRefresh }) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  
  const fgRef = useRef<any>();

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

  // Transform data for react-force-graph
  const graphPayload = useMemo(() => {
    const gNodes = filteredNodes.map(n => ({ ...n, val: 2 }));
    const validNodeIds = new Set(gNodes.map(n => n.id));
    
    // Only include edges where both source and target are in the filtered nodes
    const gEdges = edges
      .filter(e => validNodeIds.has(e.source) && validNodeIds.has(e.target))
      .map(e => ({ source: e.source, target: e.target, label: e.relation }));

    return { nodes: gNodes, links: gEdges };
  }, [filteredNodes, edges]);

  const getTypeBadgeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'CONCEPT': return 'bg-[#EBF2EC] text-[#3D5A45] border-[#D2E2D5]';
      case 'IDEA': return 'bg-[#E8F1F5] text-[#2C5282] border-[#C3D9E8]';
      case 'PERSON': return 'bg-[#F2EFE9] text-[#744210] border-[#E2D9CC]';
      case 'TOOL': return 'bg-[#F3E8EE] text-[#702459] border-[#E8CCD8]';
      default: return 'bg-[#F3F2EE] text-[#4A4943] border-[#E4E1D8]';
    }
  };

  const handleNodeClick = useCallback((node: any) => {
    const originalNode = nodes.find(n => n.id === node.id);
    if (originalNode) setSelectedNode(originalNode);
    
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(8, 2000);
    }
  }, [nodes]);

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="bg-[#FFFFFF] border border-[#E4E1D8] rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6A63]" />
          <input
            type="text"
            placeholder="Search concepts or notes..."
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
        {/* Main Interactive Graph Canvas */}
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E4E1D8] rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[500px]">
          <div className="flex items-center justify-between border-b border-[#E4E1D8] p-4 bg-[#FAFAF8]">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-[#3D5A45]" />
              <h2 className="font-serif font-semibold text-base text-[#1C1B19]">Connected Mind Map</h2>
            </div>
            <span className="font-sans text-xs text-[#6B6A63]">
              Showing {filteredNodes.length} connected ideas
            </span>
          </div>

          <div className="flex-1 relative bg-[#FAFAF8]">
            {graphPayload.nodes.length > 0 ? (
              <ForceGraph2D
                ref={fgRef}
                graphData={graphPayload}
                width={800} // This is just a base, it will be responsive via CSS container
                height={500}
                nodeLabel="label"
                nodeColor={() => '#3D5A45'}
                linkColor={() => '#D2E2D5'}
                onNodeClick={handleNodeClick}
                nodeRelSize={6}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                linkWidth={1.5}
                backgroundColor="#FAFAF8"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-[#6B6A63] italic">
                No ideas found in the network. Try capturing some text!
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Inspector */}
        <div className="space-y-6">
          <div className="bg-[#FFFFFF] border border-[#E4E1D8] rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-[#E4E1D8] pb-3">
              <Info className="w-4 h-4 text-[#3D5A45]" />
              <h3 className="font-serif font-semibold text-sm text-[#1C1B19]">Idea Details</h3>
            </div>

            {selectedNode ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-serif font-bold text-base text-[#1C1B19] leading-tight">{selectedNode.label}</h4>
                  </div>
                  <span className={`inline-block mt-1 text-[10px] font-sans font-medium px-2 py-0.5 rounded border uppercase ${getTypeBadgeColor(selectedNode.type)}`}>
                    {selectedNode.type}
                  </span>
                </div>

                <div className="bg-[#FAFAF8] border border-[#E4E1D8] p-3 rounded-lg shadow-inner">
                  <h5 className="text-[11px] font-semibold text-[#6B6A63] uppercase tracking-wider mb-2">Definition & Context</h5>
                  <p className="text-xs text-[#1C1B19] leading-relaxed font-sans">{selectedNode.context}</p>
                </div>

                <div>
                  <h5 className="text-[11px] font-semibold text-[#6B6A63] uppercase tracking-wider mb-2">Connected Ideas ({relatedEdges.length})</h5>
                  {relatedEdges.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {relatedEdges.map(edge => {
                        const isSource = edge.source === selectedNode.id;
                        const relatedLabel = isSource ? edge.target : edge.source;
                        return (
                          <div key={edge.id} className="text-xs p-2.5 bg-[#F3F2EE] rounded-md border border-[#E4E1D8] font-sans flex items-center justify-between transition-colors hover:border-[#3D5A45] cursor-default">
                            <span className="font-medium">{selectedNode.label}</span>
                            <span className="text-[10px] text-[#3D5A45] px-1 italic">
                              {isSource ? '→ ' + edge.relation + ' →' : '← ' + edge.relation + ' ←'}
                            </span>
                            <span className="font-medium">{relatedLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[#6B6A63] italic">No direct connections.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center flex flex-col items-center">
                <Network className="w-10 h-10 text-[#D2E2D5] mb-3" />
                <p className="text-xs text-[#6B6A63] italic leading-relaxed">
                  Click any node (circle) on the mind map to view its detailed context and connected relationships.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
