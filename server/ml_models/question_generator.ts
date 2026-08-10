import { ExtractedEntity } from './entity_extraction';
import { ExtractedRelationship } from './relationship_extraction';

export interface GeneratedQuestion {
  factId: string;
  entityName: string;
  questionText: string;
  type: 'multiple_choice' | 'fill_in_blank' | 'true_false' | 'short_answer';
  correctAnswer: string;
  options: string[];
  qualityScore: number;
}

export class QuestionGenerator {
  constructor() {}

  /**
   * Generates high-quality quiz questions from entities, facts, and extracted relationships
   */
  public generateQuestions(
    facts: { id: string; text: string; entityName: string }[],
    entities: ExtractedEntity[],
    relationships: ExtractedRelationship[]
  ): GeneratedQuestion[] {
    const questions: GeneratedQuestion[] = [];
    const allEntityNames = entities.map((e) => e.name);

    for (const fact of facts) {
      const entity = fact.entityName;
      const text = fact.text;

      // 1. Multiple Choice Question
      if (allEntityNames.length >= 4) {
        const distractors = allEntityNames
          .filter((e) => e.toLowerCase() !== entity.toLowerCase())
          .slice(0, 3);

        const options = [entity, ...distractors].sort(() => Math.random() - 0.5);

        questions.push({
          factId: fact.id,
          entityName: entity,
          questionText: `Which concept is described by the statement: "${text.slice(0, 120)}..."?`,
          type: 'multiple_choice',
          correctAnswer: entity,
          options,
          qualityScore: 0.92
        });
      }

      // 2. Fill-in-the-blank Question
      if (text.toLowerCase().includes(entity.toLowerCase())) {
        const blankText = text.replace(new RegExp(entity, 'gi'), '__________');
        questions.push({
          factId: fact.id,
          entityName: entity,
          questionText: `Fill in the blank: "${blankText}"`,
          type: 'fill_in_blank',
          correctAnswer: entity,
          options: [],
          qualityScore: 0.88
        });
      }

      // 3. True / False Question
      questions.push({
        factId: fact.id,
        entityName: entity,
        questionText: `True or False: ${text}`,
        type: 'true_false',
        correctAnswer: 'True',
        options: ['True', 'False'],
        qualityScore: 0.85
      });

      // 4. Short Answer Conceptual Question
      questions.push({
        factId: fact.id,
        entityName: entity,
        questionText: `Explain the significance of ${entity} in the context of: "${text.slice(0, 100)}".`,
        type: 'short_answer',
        correctAnswer: entity,
        options: [],
        qualityScore: 0.90
      });
    }

    // 5. Relationship-based questions
    for (const rel of relationships) {
      questions.push({
        factId: `rel_${rel.entity1}_${rel.entity2}`,
        entityName: rel.entity1,
        questionText: `How does ${rel.entity1} relate to ${rel.entity2}?`,
        type: 'multiple_choice',
        correctAnswer: rel.relationshipType,
        options: ['is_a', 'causes', 'part_of', 'relates_to'],
        qualityScore: 0.95
      });
    }

    return questions.sort((a, b) => b.qualityScore - a.qualityScore);
  }
}
