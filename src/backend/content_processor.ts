import { EntityExtractor } from './ml_models/entity_extraction.js';
import { KeywordExtractor } from './ml_models/keyword_extraction.js';
import { RelationshipExtractor } from './ml_models/relationship_extraction.js';
import { QuestionGenerator } from './ml_models/question_generator.js';
import { DifficultyClassifier } from './ml_models/difficulty_classifier.js';
import { KnowledgeGraph } from './knowledge_graph.js';
import { Question, Fact, Keyword, Source } from '../types.js';

export class ContentProcessor {
  private entityExtractor = new EntityExtractor();
  private keywordExtractor = new KeywordExtractor();
  private relationshipExtractor = new RelationshipExtractor();
  private questionGenerator = new QuestionGenerator();
  private difficultyClassifier = new DifficultyClassifier();

  public async process_content(
    contentText: string,
    sourceTitle: string = 'Imported Content',
    sourceUrl?: string,
    existingGraph?: KnowledgeGraph
  ): Promise<{
    source: Source;
    facts: Fact[];
    entities: ReturnType<EntityExtractor['extract_entities']> extends Promise<infer T> ? T : never;
    keywords: Keyword[];
    relationships: ReturnType<RelationshipExtractor['extract_relationships']> extends Promise<infer T> ? T : never;
    questions: Question[];
    graphData: ReturnType<KnowledgeGraph['export_json']>;
  }> {
    const cleanedText = this.cleanText(contentText);
    const graph = existingGraph || new KnowledgeGraph();

    // 1. Extract Entities
    const entities = await this.entityExtractor.extract_entities(cleanedText);

    // 2. Extract Keywords (TF-IDF + TextRank)
    const keywords = this.keywordExtractor.extract_keywords(cleanedText, 12);

    // 3. Extract Relationships
    const relationships = await this.relationshipExtractor.extract_relationships(cleanedText, entities);

    // 4. Update Knowledge Graph
    entities.forEach((ent) => {
      graph.add_entity(ent.name, ent.type, ent.importanceScore);
    });

    relationships.forEach((rel) => {
      graph.add_relationship(rel.sourceEntityName, rel.relationshipType, rel.targetEntityName, rel.confidenceScore);
    });

    // 5. Extract Facts (Sentences with high entity density)
    const rawSentences = cleanedText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    const facts: Fact[] = rawSentences.map((sentence, index) => ({
      id: `fact_${Date.now()}_${index}`,
      factText: sentence,
      createdAt: new Date().toISOString()
    }));

    // 6. Generate Questions & Predict Difficulty
    const generatedQuestions: Question[] = [];
    const topFacts = facts.slice(0, 5); // Process top key sentences

    for (let i = 0; i < topFacts.length; i++) {
      const fact = topFacts[i];
      const matchingEntity = entities[i % Math.max(1, entities.length)];
      const matchingRel = relationships[i % Math.max(1, relationships.length)];

      const rawQuestions = await this.questionGenerator.generate_questions(
        fact.factText,
        matchingEntity,
        matchingRel,
        entities
      );

      rawQuestions.forEach((rq, qIdx) => {
        // Re-classify difficulty via DifficultyClassifier
        const diffPred = this.difficultyClassifier.predict_difficulty(
          rq.questionText,
          rq.type,
          matchingEntity?.frequency || 1
        );

        generatedQuestions.push({
          id: `q_${Date.now()}_${i}_${qIdx}`,
          factId: fact.id,
          questionText: rq.questionText,
          type: rq.type,
          options: rq.options,
          correctAnswer: rq.correctAnswer,
          explanation: rq.explanation,
          difficultyScore: diffPred.difficultyScore,
          difficultyLabel: diffPred.difficultyLabel,
          qualityScore: rq.qualityScore,
          entityName: rq.entityName || matchingEntity?.name,
          createdAt: new Date().toISOString()
        });
      });
    }

    // 7. Create Source Record
    const source: Source = {
      id: `src_${Date.now()}`,
      title: sourceTitle,
      url: sourceUrl,
      contentType: sourceUrl ? 'url' : 'text',
      content: cleanedText,
      factsCount: facts.length,
      entitiesCount: entities.length,
      questionsCount: generatedQuestions.length,
      createdAt: new Date().toISOString()
    };

    return {
      source,
      facts,
      entities,
      keywords,
      relationships,
      questions: generatedQuestions,
      graphData: graph.export_json()
    };
  }

  private cleanText(text: string): string {
    return text
      .replace(/[\r\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
}
