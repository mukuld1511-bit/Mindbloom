import { Question, QuestionType } from '../../types.js';
import { RawEntity } from './entity_extraction.js';
import { ExtractedRelationship } from './relationship_extraction.js';
import { GoogleGenAI, Type } from '@google/genai';

export class QuestionGenerator {
  private getAiClient() {
    if (process.env.GEMINI_API_KEY) {
      return new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
    }
    return null;
  }

  public async generate_questions(
    fact: string,
    entity?: RawEntity,
    relationship?: ExtractedRelationship,
    allEntities: RawEntity[] = []
  ): Promise<Omit<Question, 'id' | 'createdAt'>[]> {
    if (!fact || fact.trim().length === 0) return [];

    const ai = this.getAiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Given the fact snippet: "${fact}"
Associated Entity: ${entity ? entity.name : 'N/A'}
Associated Relationship: ${relationship ? `${relationship.sourceEntityName} ${relationship.relationshipType} ${relationship.targetEntityName}` : 'N/A'}

Generate 4 high-quality educational quiz questions covering the following types:
1. multiple_choice (include 4 distractor options and correct answer)
2. fill_in_blank
3. true_false (correctAnswer must be 'True' or 'False')
4. short_answer

Return a JSON array of objects with schema:
{
  "questionText": "string",
  "type": "multiple_choice" | "fill_in_blank" | "true_false" | "short_answer",
  "options": ["Option A", "Option B", "Option C", "Option D"] (required for multiple_choice, null for others),
  "correctAnswer": "string",
  "explanation": "string explaining why the answer is correct based on the fact",
  "difficultyScore": float 0.1-0.9,
  "difficultyLabel": "easy" | "medium" | "hard",
  "qualityScore": float 0.5-1.0
}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionText: { type: Type.STRING },
                  type: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  difficultyScore: { type: Type.NUMBER },
                  difficultyLabel: { type: Type.STRING },
                  qualityScore: { type: Type.NUMBER }
                },
                required: ['questionText', 'type', 'correctAnswer', 'difficultyScore']
              }
            }
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            return this.rankAndScoreQuestions(parsed, entity?.name);
          }
        }
      } catch (err) {
        console.warn('AI question generator fallback to template heuristics:', err);
      }
    }

    // Template + ML quality ranking fallback
    return this.templateBasedGeneration(fact, entity, relationship, allEntities);
  }

  private templateBasedGeneration(
    fact: string,
    entity?: RawEntity,
    relationship?: ExtractedRelationship,
    allEntities: RawEntity[] = []
  ): Omit<Question, 'id' | 'createdAt'>[] {
    const questions: Omit<Question, 'id' | 'createdAt'>[] = [];
    const entityName = entity ? entity.name : 'this concept';
    const otherEntityNames = allEntities
      .filter((e) => e.name.toLowerCase() !== entityName.toLowerCase())
      .map((e) => e.name);

    // 1. Multiple Choice Question (Fact & Entity based)
    const options = [
      entityName,
      otherEntityNames[0] || 'Unrelated Theory',
      otherEntityNames[1] || 'Standard Hypothesis',
      otherEntityNames[2] || 'Legacy Framework'
    ];
    // Shuffle options
    const shuffled = [...options].sort(() => 0.5 - Math.random());

    questions.push({
      factId: '',
      questionText: `Which concept is primarily described by: "${fact.length > 120 ? fact.slice(0, 120) + '...' : fact}"?`,
      type: 'multiple_choice',
      options: shuffled,
      correctAnswer: entityName,
      explanation: `The fact directly highlights ${entityName}.`,
      difficultyScore: 0.35,
      difficultyLabel: 'easy',
      qualityScore: 0.85,
      entityName
    });

    // 2. Fill in the Blank
    if (entityName.length > 2 && fact.toLowerCase().includes(entityName.toLowerCase())) {
      const blankedFact = fact.replace(new RegExp(`\\b${entityName}\\b`, 'i'), '__________');
      questions.push({
        factId: '',
        questionText: `Fill in the blank: "${blankedFact}"`,
        type: 'fill_in_blank',
        correctAnswer: entityName,
        explanation: `${entityName} completes the key principle stated in the source text.`,
        difficultyScore: 0.55,
        difficultyLabel: 'medium',
        qualityScore: 0.88,
        entityName
      });
    }

    // 3. True / False Question
    questions.push({
      factId: '',
      questionText: `True or False: ${fact}`,
      type: 'true_false',
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: `This is a verbatim true statement extracted directly from the knowledge source.`,
      difficultyScore: 0.25,
      difficultyLabel: 'easy',
      qualityScore: 0.82,
      entityName
    });

    // 4. Short Answer / Relationship Question
    if (relationship) {
      questions.push({
        factId: '',
        questionText: `How does ${relationship.sourceEntityName} relate to ${relationship.targetEntityName}?`,
        type: 'short_answer',
        correctAnswer: `${relationship.sourceEntityName} ${relationship.relationshipType.replace('_', ' ')} ${relationship.targetEntityName}`,
        explanation: `Context: ${relationship.context || fact}`,
        difficultyScore: 0.75,
        difficultyLabel: 'hard',
        qualityScore: 0.9,
        entityName: relationship.sourceEntityName
      });
    } else {
      questions.push({
        factId: '',
        questionText: `Explain the core principle behind ${entityName} in your own words.`,
        type: 'short_answer',
        correctAnswer: fact,
        explanation: `A correct response should explain that ${fact}`,
        difficultyScore: 0.7,
        difficultyLabel: 'hard',
        qualityScore: 0.8,
        entityName
      });
    }

    return this.rankAndScoreQuestions(questions, entityName);
  }

  private rankAndScoreQuestions(
    rawQuestions: any[],
    defaultEntityName?: string
  ): Omit<Question, 'id' | 'createdAt'>[] {
    const formatted: Omit<Question, 'id' | 'createdAt'>[] = rawQuestions.map((q) => {
      const diffScore = parseFloat(Math.min(1.0, Math.max(0.1, q.difficultyScore || 0.5)).toFixed(2));
      let diffLabel: 'easy' | 'medium' | 'hard' = 'medium';
      if (diffScore < 0.4) diffLabel = 'easy';
      else if (diffScore > 0.65) diffLabel = 'hard';

      // Evaluate quality score based on length and clarity
      let quality = q.qualityScore || 0.8;
      if (q.questionText.length < 15) quality *= 0.8;
      if (q.type === 'multiple_choice' && (!q.options || q.options.length < 3)) quality *= 0.7;

      return {
        factId: q.factId || '',
        questionText: q.questionText,
        type: (q.type as QuestionType) || 'multiple_choice',
        options: q.options || undefined,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || 'Verified fact from knowledge base.',
        difficultyScore: diffScore,
        difficultyLabel: diffLabel,
        qualityScore: parseFloat(Math.min(1.0, Math.max(0.4, quality)).toFixed(2)),
        entityName: q.entityName || defaultEntityName
      };
    });

    // Sort by qualityScore descending
    formatted.sort((a, b) => b.qualityScore - a.qualityScore);

    // Return top 5 questions
    return formatted.slice(0, 5);
  }
}
