import { Database } from 'sql.js';
import { saveDb } from './database';
import { EntityExtractor } from './ml_models/entity_extraction';
import { RelationshipExtractor } from './ml_models/relationship_extraction';
import { KeywordExtractor } from './ml_models/keyword_extraction';
import { QuestionGenerator } from './ml_models/question_generator';
import { DifficultyClassifier } from './ml_models/difficulty_classifier';
import { PerformancePredictor } from './ml_models/performance_predictor';

export class ContentProcessor {
  private entityExtractor = new EntityExtractor();
  private relationshipExtractor = new RelationshipExtractor();
  private keywordExtractor = new KeywordExtractor();
  private questionGenerator = new QuestionGenerator();
  private difficultyClassifier = new DifficultyClassifier();
  private performancePredictor = new PerformancePredictor();

  public async processContent(
    db: Database,
    title: string,
    content: string,
    sourceUrl?: string,
    userId: string = 'user_default'
  ) {
    const now = new Date().toISOString();
    const sourceId = `src_${Date.now()}`;

    // 1. Save source into SQLite
    db.run(
      `INSERT INTO sources (id, user_id, source_url, source_title, content, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [sourceId, userId, sourceUrl || '', title, content, now]
    );

    // 2. Extract Keywords
    const keywords = this.keywordExtractor.extractKeywords(content, 8);

    // 3. Extract Entities
    const extractedEntities = this.entityExtractor.extractEntities(content);
    const entityIdMap = new Map<string, string>();

    for (const ent of extractedEntities) {
      const entId = `ent_${ent.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      entityIdMap.set(ent.name.toLowerCase(), entId);

      db.run(
        `INSERT OR REPLACE INTO entities (id, entity_name, entity_type, user_id, context, importance_score, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [entId, ent.name, ent.type, userId, ent.context, ent.importanceScore, now]
      );
    }

    // 4. Extract Relationships
    const extractedRels = this.relationshipExtractor.extractRelationships(content, extractedEntities);
    for (const rel of extractedRels) {
      const e1Id = entityIdMap.get(rel.entity1.toLowerCase()) || rel.entity1;
      const e2Id = entityIdMap.get(rel.entity2.toLowerCase()) || rel.entity2;
      const relId = `rel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      db.run(
        `INSERT OR REPLACE INTO relationships (id, entity1_id, relationship_type, entity2_id, confidence_score, user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [relId, e1Id, rel.relationshipType, e2Id, rel.confidenceScore, userId, now]
      );
    }

    // 5. Generate Facts & Questions
    const facts = extractedEntities.map((e, idx) => ({
      id: `fact_${Date.now()}_${idx}`,
      text: e.context || `${e.name} is a key ${e.type.toLowerCase()} in ${title}.`,
      entityName: e.name
    }));

    for (const f of facts) {
      const entId = entityIdMap.get(f.entityName.toLowerCase()) || f.entityName;
      db.run(
        `INSERT OR IGNORE INTO facts (id, user_id, fact_text, source_id, entity_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [f.id, userId, f.text, sourceId, entId, now]
      );
    }

    const generatedQuestions = this.questionGenerator.generateQuestions(facts, extractedEntities, extractedRels);

    for (const q of generatedQuestions) {
      const qId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const entId = entityIdMap.get(q.entityName.toLowerCase()) || q.entityName;

      // Predict difficulty score using Difficulty Classifier ML model
      const diffPred = this.difficultyClassifier.predictDifficulty(q.questionText, q.type, 2);

      db.run(
        `INSERT INTO questions (id, fact_id, question_text, question_type, answer, options_json, difficulty_score, entity_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [qId, q.factId, q.questionText, q.type, q.correctAnswer, JSON.stringify(q.options), diffPred.difficultyScore, entId, now]
      );
    }

    // 6. Train ML models on updated dataset
    this.difficultyClassifier.trainClassifier(db, 20, 0.05);
    this.performancePredictor.trainModel(db, 20, 0.04);

    // 7. Persist SQLite database to disk
    saveDb(db);

    return {
      sourceId,
      entitiesCount: extractedEntities.length,
      relationshipsCount: extractedRels.length,
      keywordsCount: keywords.length,
      questionsCount: generatedQuestions.length
    };
  }
}
