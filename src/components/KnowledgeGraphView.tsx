import React, { useState, useEffect, useRef } from 'react';
import { KnowledgeGraphData, GraphNode, GraphEdge } from '../types';
import { Search, Info, ZoomIn, ZoomOut, RefreshCw, Network, Layers, GitBranch } from 'lucide-react';

export const KnowledgeGraphView: React.FC = () => {
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [nodeContext, setNodeContext] = useState<{ neighbors: GraphNode[]; relationships: GraphEdge[] } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const fetchGraph = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/knowledge-graph');
      const data = await res.json();
      setGraphData(data);
      if (data.nodes && data.nodes.length > 0 && !selectedNode) {
        handleNodeClick(data.nodes[0]);
      }
    } catch (err) {
      console.error('Failed to load knowledge graph:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, []);

  const handleNodeClick = async (node: GraphNode) => {
    setSelectedNode(node);
    try {
      const res = await fetch(`/api/entity/${encodeURIComponent(node.name)}`);
      const data = await res.json();
      setNodeContext({
        neighbors: data.neighbors || [],
        relationships: data.relationships || []
      });
    } catch (err) {
      console.error('Failed to load entity context:', err);
    }
  };

  const entityTypeColors: Record<string, { bg: string; text: string; fill: string; stroke: string }> = {
    PERSON: { bg: 'bg-[#8A7E6B]/10', text: 'text-[#8A7E6B]', fill: '#8A7E6B', stroke: '#1C1B19' },
    ORG: { bg: 'bg-[#8A7E6B]/10', text: 'text-[#8A7E6B]', fill: '#8A7E6B', stroke: '#1C1B19' },
    PRODUCT: { bg: 'bg-[#6B6A63]/10', text: 'text-[#6B6A63]', fill: '#6B6A63', stroke: '#1C1B19' },
    CONCEPT: { bg: 'bg-[#3D5A45]/10', text: 'text-[#3D5A45]', fill: '#3D5A45', stroke: '#1C1B19' },
    LOCATION: { bg: 'bg-[#6B6A63]/10', text: 'text-[#6B6A63]', fill: '#6B6A63', stroke: '#1C1B19' },
    DATE: { bg: 'bg-[#6B6A63]/10', text: 'text-[#6B6A63]', fill: '#6B6A63', stroke: '#1C1B19' },
    TOPIC: { bg: 'bg-[#1C1B19]/10', text: 'text-[#1C1B19]', fill: '#1C1B19', stroke: '#3D5A45' },
    PRINCIPLE: { bg: 'bg-[#3D5A45]/10', text: 'text-[#3D5A45]', fill: '#3D5A45', stroke: '#1C1B19' },
    METHOD: { bg: 'bg-[#1C1B19]/10', text: 'text-[#1C1B19]', fill: '#1C1B19', stroke: '#3D5A45' },
    RESULT: { bg: 'bg-[#6B6A63]/10', text: 'text-[#6B6A63]', fill: '#6B6A63', stroke: '#1C1B19' }
  };

  const filteredNodes = graphData?.nodes.filter((n) =>
    n.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header & Stats Bar */}
      <div className="bg-white border border-[#E4E1D8] border-l-2 border-l-[#3D5A45] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono text-[#6B6A63] uppercase tracking-wider block">
            Semantic Topology
          </span>
          <h2 className="font-serif text-xl font-semibold text-[#1C1B19] mt-0.5">
            Interactive Knowledge Graph
          </h2>
          <p className="text-xs text-[#6B6A63] mt-1">
            Visualizing semantic dependencies, extracted concepts, and relational topology.
          </p>
        </div>

        {/* Stats */}
        {graphData?.stats && (
          <div className="grid grid-cols-3 gap-3 bg-[#FAFAF8] p-3 rounded border border-[#E4E1D8] text-xs font-mono">
            <div className="text-center px-2">
              <span className="text-[10px] text-[#6B6A63] block uppercase">Nodes</span>
              <span className="text-sm font-semibold text-[#1C1B19]">{graphData.stats.nodeCount}</span>
            </div>
            <div className="text-center px-2 border-x border-[#E4E1D8]">
              <span className="text-[10px] text-[#6B6A63] block uppercase">Edges</span>
              <span className="text-sm font-semibold text-[#3D5A45]">{graphData.stats.edgeCount}</span>
            </div>
            <div className="text-center px-2">
              <span className="text-[10px] text-[#6B6A63] block uppercase">Density</span>
              <span className="text-sm font-semibold text-[#8A7E6B]">{graphData.stats.density}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Graph Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Graph Canvas Container (3 cols) */}
        <div className="lg:col-span-3 bg-white border border-[#E4E1D8] p-4 relative min-h-[500px] flex flex-col justify-between">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 z-10">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#6B6A63] absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search entities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#E4E1D8] rounded pl-8 pr-3 py-1.5 text-xs text-[#1C1B19] placeholder-[#6B6A63] focus:outline-none focus:border-[#3D5A45]"
              />
            </div>

            {/* Zoom & Refresh */}
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setZoomLevel((z) => Math.min(2, z + 0.2))}
                className="p-1.5 bg-[#FAFAF8] hover:bg-[#F4F3EE] text-[#1C1B19] border border-[#E4E1D8] rounded text-xs"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.2))}
                className="p-1.5 bg-[#FAFAF8] hover:bg-[#F4F3EE] text-[#1C1B19] border border-[#E4E1D8] rounded text-xs"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={fetchGraph}
                className="p-1.5 bg-[#FAFAF8] hover:bg-[#F4F3EE] text-[#1C1B19] border border-[#E4E1D8] rounded text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* SVG Canvas */}
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#6B6A63] py-20 text-xs font-mono">
              <span>Rendering knowledge graph...</span>
            </div>
          ) : graphData && graphData.nodes.length > 0 ? (
            <div className="overflow-hidden border border-[#E4E1D8] bg-[#FAFAF8] flex-1 relative flex items-center justify-center rounded">
              <svg
                ref={svgRef}
                viewBox="0 0 700 560"
                className="w-full h-[500px] cursor-grab active:cursor-grabbing transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                {/* Render Edges */}
                {graphData.edges.map((edge) => {
                  const sourceNode = graphData.nodes.find((n) => n.id === edge.source);
                  const targetNode = graphData.nodes.find((n) => n.id === edge.target);

                  if (!sourceNode || !targetNode) return null;

                  const isSelected =
                    selectedNode && (sourceNode.id === selectedNode.id || targetNode.id === selectedNode.id);

                  return (
                    <g key={edge.id}>
                      <line
                        x1={sourceNode.x || 350}
                        y1={sourceNode.y || 280}
                        x2={targetNode.x || 350}
                        y2={targetNode.y || 280}
                        stroke={isSelected ? '#3D5A45' : '#E4E1D8'}
                        strokeWidth={isSelected ? 2 : 1}
                        strokeDasharray={edge.relationshipType === 'is_a' ? '4 2' : 'none'}
                        opacity={isSelected ? 1 : 0.7}
                      />
                      <text
                        x={((sourceNode.x || 350) + (targetNode.x || 350)) / 2}
                        y={((sourceNode.y || 280) + (targetNode.y || 280)) / 2 - 4}
                        fill="#6B6A63"
                        fontSize="9"
                        textAnchor="middle"
                        className="pointer-events-none select-none font-mono"
                      >
                        {edge.relationshipType}
                      </text>
                    </g>
                  );
                })}

                {/* Render Nodes */}
                {graphData.nodes.map((node) => {
                  const isSelected = selectedNode?.id === node.id;
                  const isHighlighted =
                    searchTerm.length > 0 && node.name.toLowerCase().includes(searchTerm.toLowerCase());
                  const typeColor = entityTypeColors[node.type] || entityTypeColors['CONCEPT'];
                  const radius = Math.max(14, Math.min(28, 14 + (node.importanceScore || 1) * 3));

                  return (
                    <g
                      key={node.id}
                      onClick={() => handleNodeClick(node)}
                      className="cursor-pointer transition-transform hover:scale-110"
                      transform={`translate(${node.x || 350}, ${node.y || 280})`}
                    >
                      <circle
                        r={radius}
                        fill={typeColor.fill}
                        stroke={isSelected ? '#1C1B19' : '#FFFFFF'}
                        strokeWidth={isSelected || isHighlighted ? 2.5 : 1}
                      />
                      <text
                        y={radius + 14}
                        fill="#1C1B19"
                        fontSize="11"
                        fontWeight={isSelected ? 'bold' : 'normal'}
                        textAnchor="middle"
                        className="pointer-events-none select-none font-sans"
                      >
                        {node.name.length > 18 ? `${node.name.slice(0, 16)}...` : node.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[#6B6A63] py-20 text-xs">
              <span>No knowledge graph nodes generated yet. Upload content first.</span>
            </div>
          )}
        </div>

        {/* Selected Entity Inspector Panel (1 col) */}
        <div className="bg-white border border-[#E4E1D8] border-l-2 border-l-[#3D5A45] p-5 space-y-4">
          <div className="pb-3 border-b border-[#E4E1D8]">
            <span className="text-[10px] font-mono text-[#6B6A63] uppercase tracking-wider block">
              Entity Inspector
            </span>
            <h3 className="font-serif text-base font-semibold text-[#1C1B19]">Details & Edges</h3>
          </div>

          {selectedNode ? (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-serif text-base font-semibold text-[#1C1B19]">{selectedNode.name}</h4>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#3D5A45]/10 text-[#3D5A45] border border-[#3D5A45]/20 uppercase">
                    {selectedNode.type}
                  </span>
                  <span className="text-[#6B6A63] font-mono text-[11px]">
                    Importance: <strong className="text-[#1C1B19]">{selectedNode.importanceScore}</strong>
                  </span>
                </div>
              </div>

              {/* Neighbors */}
              <div>
                <span className="text-[11px] font-mono text-[#6B6A63] uppercase block mb-1.5">
                  Connected Neighbors ({nodeContext?.neighbors.length || 0})
                </span>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {nodeContext?.neighbors.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNodeClick(n)}
                      className="w-full text-left p-2 rounded bg-[#FAFAF8] hover:bg-[#F4F3EE] border border-[#E4E1D8] text-xs text-[#1C1B19] flex items-center justify-between transition-colors"
                    >
                      <span className="font-medium">{n.name}</span>
                      <span className="text-[10px] font-mono text-[#6B6A63]">{n.type}</span>
                    </button>
                  ))}
                  {nodeContext?.neighbors.length === 0 && (
                    <span className="text-xs text-[#6B6A63] italic block">No direct neighbors found.</span>
                  )}
                </div>
              </div>

              {/* Relationships */}
              <div>
                <span className="text-[11px] font-mono text-[#6B6A63] uppercase block mb-1.5">
                  Semantic Relations
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
                  {nodeContext?.relationships.map((rel) => (
                    <div key={rel.id} className="p-2 rounded bg-[#FAFAF8] border border-[#E4E1D8]">
                      <div className="flex items-center justify-between text-[#1C1B19] font-mono text-[11px] mb-0.5">
                        <span className="font-semibold">{rel.source}</span>
                        <span className="px-1.5 py-0.2 bg-[#3D5A45]/10 text-[#3D5A45] rounded text-[10px]">
                          {rel.relationshipType}
                        </span>
                        <span className="font-semibold">{rel.target}</span>
                      </div>
                      <div className="text-[10px] text-[#6B6A63] font-mono">
                        Confidence: {(rel.confidenceScore * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-[#6B6A63] py-12 text-xs font-mono">
              Click any node in the graph to inspect entity relations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
