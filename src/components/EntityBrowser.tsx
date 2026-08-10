import React, { useState, useEffect } from 'react';
import { Entity } from '../types';

export const EntityBrowser: React.FC = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [entityDetails, setEntityDetails] = useState<any | null>(null);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Shortest Path Finder state
  const [pathStart, setPathStart] = useState<string>('');
  const [pathEnd, setPathEnd] = useState<string>('');
  const [calculatedPath, setCalculatedPath] = useState<string[] | null>(null);
  const [isFindingPath, setIsFindingPath] = useState<boolean>(false);

  const fetchEntities = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/entities');
      const data = await res.json();
      setEntities(data);
      if (data.length > 0 && !selectedEntity) {
        handleSelectEntity(data[0]);
      }
    } catch (err) {
      console.error('Failed to load entities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  const handleSelectEntity = async (ent: Entity) => {
    setSelectedEntity(ent);
    try {
      const res = await fetch(`/api/entity/${encodeURIComponent(ent.name)}`);
      const data = await res.json();
      setEntityDetails(data);
    } catch (err) {
      console.error('Failed to load entity details:', err);
    }
  };

  const handleFindPath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathStart || !pathEnd) return;
    setIsFindingPath(true);
    try {
      const graphRes = await fetch('/api/knowledge-graph');
      const graphData = await graphRes.json();

      const startId = pathStart.toLowerCase().trim();
      const targetId = pathEnd.toLowerCase().trim();

      const adj = new Map<string, Set<string>>();
      graphData.nodes.forEach((n: any) => adj.set(n.id, new Set()));
      graphData.edges.forEach((e: any) => {
        adj.get(e.source)?.add(e.target);
        adj.get(e.target)?.add(e.source);
      });

      const queue: string[][] = [[startId]];
      const visited = new Set<string>([startId]);
      let found: string[] | null = null;

      while (queue.length > 0) {
        const path = queue.shift()!;
        const curr = path[path.length - 1];

        if (curr === targetId) {
          found = path.map((id) => graphData.nodes.find((n: any) => n.id === id)?.name || id);
          break;
        }

        const neighbors = adj.get(curr) || new Set();
        neighbors.forEach((nbr) => {
          if (!visited.has(nbr)) {
            visited.add(nbr);
            queue.push([...path, nbr]);
          }
        });
      }

      setCalculatedPath(found);
    } catch (err) {
      console.error('Error calculating path:', err);
    } finally {
      setIsFindingPath(false);
    }
  };

  const entityTypes = [
    'ALL',
    'PERSON',
    'ORG',
    'PRODUCT',
    'CONCEPT',
    'LOCATION',
    'DATE',
    'TOPIC',
    'PRINCIPLE',
    'METHOD',
    'RESULT'
  ];

  const filteredEntities = entities.filter((e) => {
    const matchesType = selectedType === 'ALL' || e.type === selectedType;
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-[#E4E1D8] border-l-2 border-l-[#3D5A45] p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono text-[#6B6A63] uppercase tracking-wider block">
            Extracted Dictionary
          </span>
          <h2 className="font-serif text-xl font-semibold text-[#1C1B19] mt-0.5">
            Entity Repository
          </h2>
          <p className="text-xs text-[#6B6A63] mt-1">
            Browse and inspect extracted entities ranked by importance score (frequency × domain specificity).
          </p>
        </div>

        {/* Shortest Path Finder Widget */}
        <form onSubmit={handleFindPath} className="flex flex-wrap items-center gap-2 bg-[#FAFAF8] p-2.5 rounded border border-[#E4E1D8] text-xs">
          <span className="font-mono text-[11px] text-[#6B6A63] uppercase">Path Finder:</span>
          <select
            value={pathStart}
            onChange={(e) => setPathStart(e.target.value)}
            className="bg-white border border-[#E4E1D8] rounded px-2 py-1 text-[#1C1B19] text-xs focus:outline-none focus:border-[#3D5A45]"
          >
            <option value="">Start Entity</option>
            {entities.map((e) => (
              <option key={e.id} value={e.name}>{e.name}</option>
            ))}
          </select>
          <span className="text-[#6B6A63] font-mono">→</span>
          <select
            value={pathEnd}
            onChange={(e) => setPathEnd(e.target.value)}
            className="bg-white border border-[#E4E1D8] rounded px-2 py-1 text-[#1C1B19] text-xs focus:outline-none focus:border-[#3D5A45]"
          >
            <option value="">Target Entity</option>
            {entities.map((e) => (
              <option key={e.id} value={e.name}>{e.name}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!pathStart || !pathEnd || isFindingPath}
            className="px-3 py-1 bg-[#3D5A45] hover:bg-[#2D4333] text-white font-medium rounded text-xs disabled:opacity-40 transition-colors"
          >
            Find Path
          </button>
        </form>
      </div>

      {/* Path Display Banner */}
      {calculatedPath && (
        <div className="bg-white border border-[#E4E1D8] border-l-2 border-l-[#3D5A45] p-4 text-xs text-[#1C1B19]">
          <strong className="font-serif font-semibold text-sm block">Shortest Graph Path Discovered:</strong>
          <div className="flex items-center space-x-2 mt-2 font-mono text-xs flex-wrap">
            {calculatedPath.map((nodeName, idx) => (
              <React.Fragment key={idx}>
                <span className="px-2 py-0.5 bg-[#FAFAF8] border border-[#E4E1D8] rounded text-[#1C1B19]">
                  {nodeName}
                </span>
                {idx < calculatedPath.length - 1 && <span className="text-[#3D5A45]">→</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Entity List & Filter (1 col) */}
        <div className="bg-white border border-[#E4E1D8] p-4 space-y-3">
          <div className="space-y-2">
            {/* Search */}
            <input
              type="text"
              placeholder="Search entities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#FAFAF8] border border-[#E4E1D8] rounded px-3 py-1.5 text-xs text-[#1C1B19] placeholder-[#6B6A63] focus:outline-none focus:border-[#3D5A45]"
            />

            {/* Type Filter Pills */}
            <div className="flex overflow-x-auto space-x-1 pb-1">
              {entityTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase whitespace-nowrap transition-colors ${
                    selectedType === type
                      ? 'bg-[#3D5A45] text-white font-semibold'
                      : 'bg-[#FAFAF8] text-[#6B6A63] border border-[#E4E1D8] hover:bg-[#F4F3EE]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="text-center text-[#6B6A63] py-12 text-xs font-mono">Loading entities...</div>
            ) : filteredEntities.length > 0 ? (
              filteredEntities.map((ent) => {
                const isSelected = selectedEntity?.id === ent.id;
                return (
                  <button
                    key={ent.id}
                    onClick={() => handleSelectEntity(ent)}
                    className={`w-full text-left p-2.5 rounded border text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#3D5A45]/10 border-[#3D5A45] text-[#1C1B19] font-medium'
                        : 'bg-[#FAFAF8] border-[#E4E1D8] text-[#1C1B19] hover:bg-[#F4F3EE]'
                    }`}
                  >
                    <div>
                      <span className="font-serif font-semibold text-xs block">{ent.name}</span>
                      <span className="text-[10px] text-[#6B6A63] font-mono">{ent.type}</span>
                    </div>
                    <span className="px-1.5 py-0.5 bg-white border border-[#E4E1D8] text-[10px] font-mono text-[#3D5A45]">
                      {ent.importanceScore}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="text-center text-[#6B6A63] py-12 text-xs font-mono">No entities match query.</div>
            )}
          </div>
        </div>

        {/* Right: Detailed Context Inspector (2 cols) */}
        <div className="md:col-span-2 bg-white border border-[#E4E1D8] border-l-2 border-l-[#3D5A45] p-5 space-y-5">
          {selectedEntity ? (
            <>
              {/* Header Info */}
              <div className="flex items-start justify-between pb-3 border-b border-[#E4E1D8]">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#3D5A45]/10 text-[#3D5A45] border border-[#3D5A45]/20 uppercase mb-1 inline-block">
                    {selectedEntity.type}
                  </span>
                  <h3 className="font-serif text-xl font-semibold text-[#1C1B19]">{selectedEntity.name}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#6B6A63] font-mono uppercase block">Importance</span>
                  <span className="text-xl font-mono font-semibold text-[#3D5A45]">{selectedEntity.importanceScore}</span>
                </div>
              </div>

              {/* Context Sentence */}
              <div className="bg-[#FAFAF8] border border-[#E4E1D8] p-3.5 rounded space-y-1">
                <span className="text-[10px] font-mono uppercase text-[#6B6A63] block">
                  Extracted Sentence Context
                </span>
                <p className="text-xs text-[#1C1B19] italic leading-relaxed">
                  "{selectedEntity.context || 'Context sentence extracted during local pattern matching pass.'}"
                </p>
              </div>

              {/* Neighboring Entities */}
              {entityDetails?.neighbors && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-mono uppercase text-[#6B6A63]">
                    Connected Knowledge Neighbors ({entityDetails.neighbors.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {entityDetails.neighbors.map((nbr: any) => (
                      <div key={nbr.id} className="p-2 bg-[#FAFAF8] border border-[#E4E1D8] rounded flex items-center justify-between text-xs">
                        <div>
                          <span className="font-medium text-[#1C1B19] block">{nbr.name}</span>
                          <span className="text-[10px] text-[#6B6A63] font-mono">{nbr.type}</span>
                        </div>
                        <span className="text-[10px] text-[#3D5A45] font-mono">
                          Degree: {nbr.degree}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Questions */}
              {entityDetails?.questions && entityDetails.questions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-mono uppercase text-[#6B6A63]">
                    Generated Quiz Questions ({entityDetails.questions.length})
                  </h4>
                  <div className="space-y-2">
                    {entityDetails.questions.map((q: any) => (
                      <div key={q.id} className="p-3 bg-[#FAFAF8] border border-[#E4E1D8] rounded text-xs space-y-1">
                        <span className="font-serif font-medium text-[#1C1B19] block">{q.questionText}</span>
                        <div className="flex items-center justify-between text-[10px] text-[#6B6A63] font-mono pt-1 border-t border-[#E4E1D8]/60">
                          <span>Answer: <strong className="text-[#3D5A45]">{q.correctAnswer}</strong></span>
                          <span className="uppercase">{q.type.replace('_', ' ')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-[#6B6A63] py-20 text-xs font-mono">
              Select an entity from the repository list to inspect context and graph connections.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

