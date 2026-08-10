export type EntityType =
  | 'PERSON'
  | 'ORG'
  | 'PRODUCT'
  | 'CONCEPT'
  | 'LOCATION'
  | 'DATE'
  | 'TOPIC'
  | 'PRINCIPLE'
  | 'METHOD'
  | 'RESULT';

export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  context?: string;
  importanceScore: number;
  createdAt: string;
  userId?: string;
}

export interface GraphNode {
  id: string;
  name: string;
  type: EntityType;
  importanceScore: number;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: 'is_a' | 'causes' | 'part_of' | 'relates_to';
  confidenceScore: number;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    nodeCount: number;
    edgeCount: number;
    density: string;
  };
}

export interface Question {
  id: string;
  factId: string;
  entityName: string;
  questionText: string;
  type: 'multiple_choice' | 'fill_in_blank' | 'true_false' | 'short_answer';
  correctAnswer: string;
  options?: string[];
  difficultyScore: number;
  difficultyLabel: 'easy' | 'medium' | 'hard';
  createdAt: string;
}

export interface QuizHistoryItem {
  id: string;
  userId: string;
  questionId: string;
  userAnswer: string;
  performanceGrade: number; // 0.0 to 1.0
  reviewInterval: number; // days
  easinessFactor: number;
  nextReviewDate: string;
  createdAt: string;
}

export interface Source {
  id: string;
  userId: string;
  url?: string;
  title: string;
  content: string;
  factsCount: number;
  entitiesCount: number;
  questionsCount: number;
  createdAt: string;
}

export interface Fact {
  id: string;
  userId: string;
  factText: string;
  sourceId: string;
  entityId: string;
  createdAt: string;
}

export interface UserStats {
  accuracyRate: number;
  masteryPercentage: number;
  totalEntities: number;
  totalRelationships: number;
  totalReviews: number;
  dueTodayCount: number;
  streakDays: number;
}

export interface PerformancePrediction {
  predictedAccuracy: number;
  learningCurve: { day: number; predictedRetention: number }[];
  recommendation: string;
}
