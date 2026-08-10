import { Database } from 'sql.js';
import { KnowledgeGraphData, GraphNode, GraphEdge, EntityType } from '../src/types';

export class KnowledgeGraphManager {
  constructor() {}

  public getGraphData(db: Database, userId: string = 'user_default'): KnowledgeGraphData {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Query Entities from SQLite
    try {
      const stmtNodes = db.prepare(`
        SELECT id, entity_name, entity_type, importance_score 
        FROM entities 
        WHERE user_id = ? OR user_id = 'user_default'
      `);
      stmtNodes.bind([userId]);

      while (stmtNodes.step()) {
        const row = stmtNodes.getAsObject();
        nodes.push({
          id: (row.id as string) || (row.entity_name as string),
          name: (row.entity_name as string) || 'Unnamed Entity',
          type: (row.entity_type as EntityType) || 'CONCEPT',
          importanceScore: Number(row.importance_score ?? 1.0)
        });
      }
      stmtNodes.free();
    } catch (err) {
      console.error('Error fetching nodes for knowledge graph:', err);
    }

    // Query Relationships from SQLite
    try {
      const stmtEdges = db.prepare(`
        SELECT id, entity1_id, relationship_type, entity2_id, confidence_score 
        FROM relationships 
        WHERE user_id = ? OR user_id = 'user_default'
      `);
      stmtEdges.bind([userId]);

      while (stmtEdges.step()) {
        const row = stmtEdges.getAsObject();
        edges.push({
          id: (row.id as string) || `e_${Math.random()}`,
          source: (row.entity1_id as string),
          target: (row.entity2_id as string),
          relationshipType: (row.relationship_type as any) || 'relates_to',
          confidenceScore: Number(row.confidence_score ?? 0.8)
        });
      }
      stmtEdges.free();
    } catch (err) {
      console.error('Error fetching edges for knowledge graph:', err);
    }

    const n = nodes.length;
    const maxEdges = n > 1 ? (n * (n - 1)) / 2 : 1;
    const densityVal = (edges.length / maxEdges).toFixed(3);

    return {
      nodes,
      edges,
      stats: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        density: densityVal
      }
    };
  }
}
