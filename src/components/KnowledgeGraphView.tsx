import React, { useState, useMemo, useRef, useCallback } from 'react';
import { KnowledgeGraphData, GraphNode } from '../types';
import { Network, Search, Filter, Sparkles } from 'lucide-react';
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

  const getNodeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'CONCEPT': return '#B5EAD7'; // Mint
      case 'IDEA': return '#E2F0CB'; // Pale Green
      case 'PERSON': return '#FFDAC1'; // Peach
      case 'TOOL': return '#C7CEEA'; // Lavender
      case 'TOPIC': return '#FF9AA2'; // Pink
      case 'METHOD': return '#FFB7B2'; // Soft Red
      case 'PRINCIPLE': return '#FFEDD8'; // Light Orange
      default: return '#E0E0E0';
    }
  };

  const handleNodeClick = useCallback((node: any) => {
    const originalNode = nodes.find(n => n.id === node.id);
    if (originalNode) setSelectedNode(originalNode);
    
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(4, 2000);
    }
  }, [nodes]);

  const drawPastelBubble = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.label || '';
    const fontSize = 12 / globalScale;
    ctx.font = `600 ${fontSize}px Inter, sans-serif`;
    
    const textWidth = ctx.measureText(label).width;
    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 1.5); // some padding
    const radius = Math.max(bckgDimensions[0], bckgDimensions[1]) / 2;

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = getNodeColor(node.type);
    ctx.fill();
    ctx.lineWidth = 1 / globalScale;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4A4943'; // Soft dark text
    ctx.fillText(label, node.x, node.y);

    node.__bckgDimensions = bckgDimensions; // to update bounds for hover
  }, []);

  return (
    <div className="bg-[#FDFBF7] min-h-full rounded-2xl space-y-6">
      {/* Fun Floating Header */}
      <div className="bg-white/60 backdrop-blur-md rounded-full px-6 py-3 flex flex-col md:flex-row gap-4 items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-[#F4F1DE]">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#A8A69E]" />
          <input
            type="text"
            placeholder="Search your ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-full text-sm bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B5EAD7]/50 shadow-inner text-[#4A4943] transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <Filter className="w-4 h-4 text-[#A8A69E]" />
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-transform hover:scale-105 ${
              typeFilter === 'ALL'
                ? 'bg-[#4A4943] text-white shadow-md'
                : 'bg-white text-[#8C8B82] hover:bg-[#F3F2EE]'
            }`}
          >
            All
          </button>
          {entityTypes.map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-transform hover:scale-105 ${
                typeFilter === type
                  ? 'text-white shadow-md'
                  : 'bg-white text-[#8C8B82] hover:bg-[#F3F2EE]'
              }`}
              style={typeFilter === type ? { backgroundColor: getNodeColor(type), color: '#4A4943' } : {}}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Playful Interactive Graph Canvas */}
        <div className="lg:col-span-3 bg-white/40 rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-[#F4F1DE] flex flex-col min-h-[600px] relative">
          
          <div className="absolute top-4 left-6 z-10 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-sm flex items-center gap-2 border border-[#F4F1DE]">
            <Sparkles className="w-4 h-4 text-[#FF9AA2]" />
            <h2 className="font-sans font-bold text-sm text-[#4A4943]">My Idea Galaxy</h2>
          </div>

          <div className="flex-1 relative cursor-grab active:cursor-grabbing">
            {graphPayload.nodes.length > 0 ? (
              <ForceGraph2D
                ref={fgRef}
                graphData={graphPayload}
                width={900} 
                height={600}
                nodeCanvasObject={drawPastelBubble}
                nodePointerAreaPaint={(node: any, color, ctx) => {
                  ctx.fillStyle = color;
                  const bckgDimensions = node.__bckgDimensions || [20, 20];
                  const radius = Math.max(bckgDimensions[0], bckgDimensions[1]) / 2;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                  ctx.fill();
                }}
                linkColor={() => '#E8E6D9'}
                linkWidth={3}
                linkDirectionalParticles={3}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalParticleWidth={4}
                linkDirectionalParticleColor={() => '#FFDAC1'}
                onNodeClick={handleNodeClick}
                d3VelocityDecay={0.2}
                d3AlphaDecay={0.01}
                backgroundColor="transparent"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-[#A8A69E]">
                It's a little empty here... capture some notes to build your galaxy!
              </div>
            )}
          </div>
        </div>

        {/* Floating Minimal Sidebar */}
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-md border border-[#F4F1DE] rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col h-full">
            {selectedNode ? (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <span 
                    className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm"
                    style={{ backgroundColor: getNodeColor(selectedNode.type), color: '#4A4943' }}
                  >
                    {selectedNode.type}
                  </span>
                  <h4 className="font-serif text-2xl font-bold text-[#4A4943] leading-tight">
                    {selectedNode.label}
                  </h4>
                </div>

                <div className="bg-[#FDFBF7] p-4 rounded-2xl shadow-inner border border-[#F4F1DE]">
                  <p className="text-sm text-[#5C5B52] leading-relaxed font-sans font-medium">
                    {selectedNode.context}
                  </p>
                </div>

                <div className="pt-2">
                  <h5 className="text-[11px] font-bold text-[#A8A69E] uppercase tracking-wider mb-3 px-1">
                    Connected Ideas
                  </h5>
                  {relatedEdges.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                      {relatedEdges.map(edge => {
                        const isSource = edge.source === selectedNode.id;
                        const relatedLabel = isSource ? edge.target : edge.source;
                        return (
                          <div key={edge.id} className="group bg-white p-3 rounded-2xl border border-[#F4F1DE] shadow-sm flex flex-col gap-1 transition-transform hover:-translate-y-1">
                            <span className="text-[10px] font-bold text-[#C7CEEA] uppercase tracking-wider">
                              {edge.relation}
                            </span>
                            <span className="text-sm font-bold text-[#4A4943]">
                              {relatedLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-[#A8A69E] italic px-1">Floating alone in space.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="w-20 h-20 bg-[#FFEDD8] rounded-full flex items-center justify-center shadow-inner">
                  <Network className="w-8 h-8 text-[#FFB7B2]" />
                </div>
                <h3 className="font-bold text-lg text-[#4A4943]">Explore Connections</h3>
                <p className="text-sm text-[#8C8B82] leading-relaxed px-4">
                  Tap any pastel bubble in your galaxy to reveal its context and connections.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
