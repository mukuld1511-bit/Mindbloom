import { GraphNode, GraphEdge, GraphStats, KnowledgeGraphData, EntityType, RelationshipType } from '../types.js';

export class KnowledgeGraph {
  private nodesMap = new Map<string, GraphNode>();
  private edgesMap = new Map<string, GraphEdge>();
  private adjacencyList = new Map<string, Set<string>>();

  public add_entity(
    entityName: string,
    entityType: EntityType = 'CONCEPT',
    importanceScore: number = 0.5
  ): GraphNode {
    const id = entityName.toLowerCase().trim();
    if (this.nodesMap.has(id)) {
      const existing = this.nodesMap.get(id)!;
      existing.importanceScore = Math.max(existing.importanceScore, importanceScore);
      return existing;
    }

    const node: GraphNode = {
      id,
      name: entityName.trim(),
      type: entityType,
      importanceScore,
      degree: 0
    };

    this.nodesMap.set(id, node);
    if (!this.adjacencyList.has(id)) {
      this.adjacencyList.set(id, new Set());
    }

    return node;
  }

  public add_relationship(
    sourceName: string,
    relationshipType: RelationshipType,
    targetName: string,
    confidenceScore: number = 0.8
  ): GraphEdge {
    const sourceNode = this.add_entity(sourceName);
    const targetNode = this.add_entity(targetName);

    const edgeId = `${sourceNode.id}::${relationshipType}::${targetNode.id}`;

    if (!this.edgesMap.has(edgeId)) {
      const edge: GraphEdge = {
        id: edgeId,
        source: sourceNode.id,
        target: targetNode.id,
        relationshipType,
        confidenceScore
      };
      this.edgesMap.set(edgeId, edge);

      // Update adjacency and degrees
      this.adjacencyList.get(sourceNode.id)?.add(targetNode.id);
      this.adjacencyList.get(targetNode.id)?.add(sourceNode.id);

      sourceNode.degree = (this.adjacencyList.get(sourceNode.id) || new Set()).size;
      targetNode.degree = (this.adjacencyList.get(targetNode.id) || new Set()).size;
    }

    return this.edgesMap.get(edgeId)!;
  }

  public get_entity_context(entityName: string): {
    entity: GraphNode | null;
    neighbors: GraphNode[];
    relationships: GraphEdge[];
  } {
    const id = entityName.toLowerCase().trim();
    const entity = this.nodesMap.get(id) || null;
    if (!entity) {
      return { entity: null, neighbors: [], relationships: [] };
    }

    const neighborIds = this.adjacencyList.get(id) || new Set();
    const neighbors: GraphNode[] = [];
    neighborIds.forEach((nid) => {
      const n = this.nodesMap.get(nid);
      if (n) neighbors.push(n);
    });

    const relationships: GraphEdge[] = [];
    this.edgesMap.forEach((edge) => {
      if (edge.source === id || edge.target === id) {
        relationships.push(edge);
      }
    });

    return { entity, neighbors, relationships };
  }

  public get_path(entityName1: string, entityName2: string): string[] {
    const startId = entityName1.toLowerCase().trim();
    const targetId = entityName2.toLowerCase().trim();

    if (!this.nodesMap.has(startId) || !this.nodesMap.has(targetId)) return [];
    if (startId === targetId) return [this.nodesMap.get(startId)!.name];

    // BFS shortest path search
    const queue: string[][] = [[startId]];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];

      if (current === targetId) {
        return path.map((id) => this.nodesMap.get(id)?.name || id);
      }

      const neighbors = this.adjacencyList.get(current) || new Set();
      neighbors.forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      });
    }

    return []; // No path found
  }

  public get_graph_stats(): GraphStats {
    const nodeCount = this.nodesMap.size;
    const edgeCount = this.edgesMap.size;

    // Density = 2 * E / (V * (V - 1))
    let density = 0;
    if (nodeCount > 1) {
      density = (2 * edgeCount) / (nodeCount * (nodeCount - 1));
    }

    let totalDegree = 0;
    this.nodesMap.forEach((node) => {
      totalDegree += node.degree;
    });

    const avgDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;

    return {
      nodeCount,
      edgeCount,
      density: parseFloat(density.toFixed(3)),
      avgDegree: parseFloat(avgDegree.toFixed(2)),
      clustersCount: Math.max(1, Math.round(nodeCount / 4))
    };
  }

  public export_json(): KnowledgeGraphData {
    // Generate circular layout coordinates for canvas rendering
    const nodes = Array.from(this.nodesMap.values());
    const edges = Array.from(this.edgesMap.values());
    const count = nodes.length;
    const radius = Math.min(280, 50 + count * 15);

    nodes.forEach((node, index) => {
      const angle = (index / Math.max(1, count)) * 2 * Math.PI;
      node.x = Math.round(350 + radius * Math.cos(angle));
      node.y = Math.round(280 + radius * Math.sin(angle));
    });

    return {
      nodes,
      edges,
      stats: this.get_graph_stats()
    };
  }

  public import_json(data: KnowledgeGraphData): void {
    this.nodesMap.clear();
    this.edgesMap.clear();
    this.adjacencyList.clear();

    if (data.nodes) {
      data.nodes.forEach((n) => this.add_entity(n.name, n.type, n.importanceScore));
    }
    if (data.edges) {
      data.edges.forEach((e) => {
        const sourceNode = this.nodesMap.get(e.source);
        const targetNode = this.nodesMap.get(e.target);
        if (sourceNode && targetNode) {
          this.add_relationship(sourceNode.name, e.relationshipType, targetNode.name, e.confidenceScore);
        }
      });
    }
  }
}
