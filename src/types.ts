export interface Entity {
  id: number;
  source_id?: number;
  name: string;
  type: string; // TOPIC, PRINCIPLE, METHOD, RESULT, CONCEPT, PERSON, ORG, LOCATION
  context: string;
  importance: number;
  created_at?: string;
}

export interface Relationship {
  id?: string;
  source: string;
  target: string;
  relation: string; // is_a, causes, part_of, relates_to
  confidence: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  importance: number;
  context: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  confidence: number;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Question {
  id: number;
  question_type: 'multiple_choice' | 'fill_in_blank' | 'true_false' | 'short_answer';
  prompt: string;
  correct_answer: string;
  choices: string[];
  target_entity: string;
  explanation: string;
  difficulty: number;
  repetitions: number;
  easiness_factor: number;
  interval_days: number;
  next_review_date?: string;
}

export interface Source {
  id: number;
  title: string;
  content: string;
  full_content?: string;
  source_url?: string;
  created_at?: string;
  entities_count?: number;
  questions_count?: number;
}

export interface SystemStats {
  sources_count: number;
  entities_count: number;
  relationships_count: number;
  questions_count: number;
  due_questions_count: number;
  graph_nodes: number;
  graph_edges: number;
  graph_density: number;
}

export interface RetentionProjection {
  user_avg_performance: number;
  projections: { day: number; retention: number }[];
}
