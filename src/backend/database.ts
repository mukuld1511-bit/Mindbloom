import { Source, Entity, Relationship, Fact, Question, QuizHistoryRecord, KnowledgeGraphData, UserStats } from '../types.js';
import { KnowledgeGraph } from './knowledge_graph.js';
import { SpacedRepetitionEngine } from './ml_models/spaced_repetition.js';
import { PerformancePredictor } from './ml_models/performance_predictor.js';

export class AppDatabase {
  public sources: Map<string, Source> = new Map();
  public entities: Map<string, Entity> = new Map();
  public relationships: Map<string, Relationship> = new Map();
  public facts: Map<string, Fact> = new Map();
  public questions: Map<string, Question> = new Map();
  public quizHistory: QuizHistoryRecord[] = [];
  public knowledgeGraph: KnowledgeGraph = new KnowledgeGraph();

  private sm2Engine = new SpacedRepetitionEngine();
  private perfPredictor = new PerformancePredictor();

  constructor() {
    this.seedInitialData();
  }

  public seedInitialData(): void {
    if (this.sources.size > 0) return;

    // Seed Source 1: Spaced Repetition & Cognitive Psychology
    const src1Id = 'src_seed_1';
    const src1: Source = {
      id: src1Id,
      title: 'Spaced Repetition & Neural Memory Consolidation',
      url: 'https://en.wikipedia.org/wiki/Spaced_repetition',
      contentType: 'url',
      content: `Spaced repetition is an evidence-based learning technique that is usually performed with flashcards. Newly introduced and more difficult flashcards are shown more frequently, while older and less difficult flashcards are shown less frequently to exploit the psychological spacing effect. The SM-2 algorithm, developed by Piotr Woźniak, calculates optimal review intervals using an easiness factor based on recall grade. Synaptic plasticities in the hippocampus reinforce long-term memory traces through memory consolidation.`,
      factsCount: 4,
      entitiesCount: 6,
      questionsCount: 5,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    };
    this.sources.set(src1Id, src1);

    // Seed Entities
    const seededEntities: Entity[] = [
      { id: 'ent_1', name: 'Spaced Repetition', type: 'METHOD', context: 'Evidence-based learning technique', frequency: 8, specificity: 0.9, importanceScore: 7.2, createdAt: new Date().toISOString() },
      { id: 'ent_2', name: 'SM-2 Algorithm', type: 'PRINCIPLE', context: 'Calculates review intervals using easiness factor', frequency: 6, specificity: 0.95, importanceScore: 5.7, createdAt: new Date().toISOString() },
      { id: 'ent_3', name: 'Piotr Woźniak', type: 'PERSON', context: 'Creator of the SuperMemo SM-2 algorithm', frequency: 3, specificity: 0.85, importanceScore: 2.55, createdAt: new Date().toISOString() },
      { id: 'ent_4', name: 'Spacing Effect', type: 'CONCEPT', context: 'Psychological phenomenon where learning is greater when spread out', frequency: 5, specificity: 0.88, importanceScore: 4.4, createdAt: new Date().toISOString() },
      { id: 'ent_5', name: 'Hippocampus', type: 'LOCATION', context: 'Brain structure central to memory consolidation', frequency: 4, specificity: 0.82, importanceScore: 3.28, createdAt: new Date().toISOString() },
      { id: 'ent_6', name: 'Memory Consolidation', type: 'RESULT', context: 'Process where memory traces are stabilized into long-term storage', frequency: 5, specificity: 0.9, importanceScore: 4.5, createdAt: new Date().toISOString() }
    ];

    seededEntities.forEach((e) => this.entities.set(e.id, e));

    // Seed Relationships & Build Graph
    this.knowledgeGraph.add_relationship('Spaced Repetition', 'uses', 'Spacing Effect', 0.95);
    this.knowledgeGraph.add_relationship('SM-2 Algorithm', 'is_a', 'Spaced Repetition', 0.92);
    this.knowledgeGraph.add_relationship('Piotr Woźniak', 'causes', 'SM-2 Algorithm', 0.9);
    this.knowledgeGraph.add_relationship('Spaced Repetition', 'leads_to', 'Memory Consolidation', 0.88);
    this.knowledgeGraph.add_relationship('Memory Consolidation', 'part_of', 'Hippocampus', 0.85);

    // Seed Questions with SM-2 metrics
    const q1: Question = {
      id: 'q_1',
      factId: 'f_1',
      questionText: 'Which algorithm developed by Piotr Woźniak optimizes flashcard review intervals using an Easiness Factor?',
      type: 'multiple_choice',
      options: ['SM-2 Algorithm', 'Dijkstra Algorithm', 'PageRank Algorithm', 'Leitner System'],
      correctAnswer: 'SM-2 Algorithm',
      explanation: 'Piotr Woźniak developed the SM-2 algorithm for SuperMemo to compute adaptive spaced intervals.',
      difficultyScore: 0.3,
      difficultyLabel: 'easy',
      qualityScore: 0.95,
      entityName: 'SM-2 Algorithm',
      createdAt: new Date().toISOString()
    };

    const q2: Question = {
      id: 'q_2',
      factId: 'f_2',
      questionText: 'What cognitive psychology phenomenon explains why spreading review sessions over time increases retention?',
      type: 'multiple_choice',
      options: ['Spacing Effect', 'Stroop Effect', 'Hawthorne Effect', 'Flynn Effect'],
      correctAnswer: 'Spacing Effect',
      explanation: 'The Spacing Effect demonstrates that distributed practice yields superior long-term retention compared to massed practice.',
      difficultyScore: 0.45,
      difficultyLabel: 'medium',
      qualityScore: 0.9,
      entityName: 'Spacing Effect',
      createdAt: new Date().toISOString()
    };

    const q3: Question = {
      id: 'q_3',
      factId: 'f_3',
      questionText: 'True or False: The minimum Easiness Factor (EF) allowed in standard SM-2 algorithm calculations is 1.3.',
      type: 'true_false',
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: 'In SM-2, EF is capped below at 1.3 to prevent review intervals from becoming excessively short.',
      difficultyScore: 0.5,
      difficultyLabel: 'medium',
      qualityScore: 0.88,
      entityName: 'SM-2 Algorithm',
      createdAt: new Date().toISOString()
    };

    const q4: Question = {
      id: 'q_4',
      factId: 'f_4',
      questionText: 'Fill in the blank: Neural memory traces are stabilized into long-term storage through __________ in the hippocampus.',
      type: 'fill_in_blank',
      correctAnswer: 'Memory Consolidation',
      explanation: 'Memory consolidation stabilizes labile synaptic connections into permanent neural circuits.',
      difficultyScore: 0.65,
      difficultyLabel: 'medium',
      qualityScore: 0.87,
      entityName: 'Memory Consolidation',
      createdAt: new Date().toISOString()
    };

    const q5: Question = {
      id: 'q_5',
      factId: 'f_5',
      questionText: 'Explain how the SM-2 algorithm adjusts review intervals after a failed recall attempt (Grade < 3).',
      type: 'short_answer',
      correctAnswer: 'The review interval is reset to 1 day and the easiness factor decreases.',
      explanation: 'When a user fails to recall an item, SM-2 resets the interval back to day 1 to rebuild memory strength.',
      difficultyScore: 0.8,
      difficultyLabel: 'hard',
      qualityScore: 0.92,
      entityName: 'SM-2 Algorithm',
      createdAt: new Date().toISOString()
    };

    [q1, q2, q3, q4, q5].forEach((q) => this.questions.set(q.id, q));

    // Seed Quiz History
    this.quizHistory.push({
      id: 'hist_1',
      questionId: 'q_1',
      userAnswer: 'SM-2 Algorithm',
      isCorrect: true,
      performanceGrade: 1.0,
      previousInterval: 1,
      nextInterval: 6,
      easinessFactor: 2.6,
      nextReviewDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // due now!
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    });

    this.quizHistory.push({
      id: 'hist_2',
      questionId: 'q_2',
      userAnswer: 'Spacing Effect',
      isCorrect: true,
      performanceGrade: 0.8,
      previousInterval: 1,
      nextInterval: 6,
      easinessFactor: 2.5,
      nextReviewDate: new Date(Date.now() - 5000 * 60).toISOString(), // due now!
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  public getUserStats(): UserStats {
    const totalReviews = this.quizHistory.length;
    const correctReviews = this.quizHistory.filter((h) => h.isCorrect).length;
    const accuracyRate = totalReviews > 0 ? parseFloat((correctReviews / totalReviews).toFixed(2)) : 1.0;

    const dueQuestions = Array.from(this.questions.values()).filter((q) => {
      const history = this.quizHistory.filter((h) => h.questionId === q.id);
      if (history.length === 0) return true; // new
      const latest = history[history.length - 1];
      return new Date(latest.nextReviewDate) <= new Date();
    });

    const graphStats = this.knowledgeGraph.get_graph_stats();

    return {
      totalReviews,
      accuracyRate,
      masteryPercentage: Math.min(100, Math.round(accuracyRate * 85 + totalReviews * 2)),
      streakDays: 4,
      dueTodayCount: dueQuestions.length,
      totalEntities: graphStats.nodeCount,
      totalRelationships: graphStats.edgeCount,
      totalSources: this.sources.size
    };
  }
}

export const db = new AppDatabase();
