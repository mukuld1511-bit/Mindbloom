import { RelationshipType } from '../../types.js';
import { RawEntity } from './entity_extraction.js';
import { GoogleGenAI, Type } from '@google/genai';

export interface ExtractedRelationship {
  sourceEntityName: string;
  relationshipType: RelationshipType;
  targetEntityName: string;
  confidenceScore: number;
  context: string;
}

export class RelationshipExtractor {
  private getAiClient() {
    if (process.env.GEMINI_API_KEY) {
      return new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
    }
    return null;
  }

  public async extract_relationships(
    text: string,
    knownEntities: RawEntity[] = []
  ): Promise<ExtractedRelationship[]> {
    if (!text || text.trim().length === 0) return [];

    const ai = this.getAiClient();
    if (ai && knownEntities.length > 0) {
      try {
        const entityList = knownEntities.map((e) => e.name).join(', ');
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Analyze the following text and extract semantic relationships between entities (especially from this list if possible: [${entityList}]).
Supported relationship types: ['is_a', 'causes', 'part_of', 'relates_to', 'uses', 'leads_to'].

Return JSON array of:
{
  "sourceEntityName": "Entity1",
  "relationshipType": "is_a" | "causes" | "part_of" | "relates_to" | "uses" | "leads_to",
  "targetEntityName": "Entity2",
  "confidenceScore": float 0.5-1.0,
  "context": "sentence snippet"
}

Text:
"""${text.slice(0, 4000)}"""`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sourceEntityName: { type: Type.STRING },
                  relationshipType: { type: Type.STRING },
                  targetEntityName: { type: Type.STRING },
                  confidenceScore: { type: Type.NUMBER },
                  context: { type: Type.STRING }
                },
                required: ['sourceEntityName', 'relationshipType', 'targetEntityName']
              }
            }
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            return this.cleanAndRankRelationships(parsed);
          }
        }
      } catch (err) {
        console.warn('AI relationship extraction fallback to rule-based patterns:', err);
      }
    }

    // Pattern-based and Co-occurrence dependency extraction
    return this.patternBasedExtraction(text, knownEntities);
  }

  private patternBasedExtraction(text: string, knownEntities: RawEntity[]): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);

    // Explicit regex patterns
    const patterns: { regex: RegExp; rel: RelationshipType; conf: number }[] = [
      { regex: /\b(.+?)\s+(?:is a|is an|refers to an?|defined as)\s+(.+)\b/i, rel: 'is_a', conf: 0.9 },
      { regex: /\b(.+?)\s+(?:causes|leads to|results in|triggers|produces)\s+(.+)\b/i, rel: 'causes', conf: 0.88 },
      { regex: /\b(.+?)\s+(?:is part of|belongs to|is component of|is subset of)\s+(.+)\b/i, rel: 'part_of', conf: 0.85 },
      { regex: /\b(.+?)\s+(?:relates to|associated with|connected to|depends on)\s+(.+)\b/i, rel: 'relates_to', conf: 0.8 },
      { regex: /\b(.+?)\s+(?:uses|utilizes|leverages|applies|employs)\s+(.+)\b/i, rel: 'uses', conf: 0.82 },
      { regex: /\b(.+?)\s+(?:drives|stimulates|accelerates|guides)\s+(.+)\b/i, rel: 'leads_to', conf: 0.84 }
    ];

    sentences.forEach((sentence) => {
      patterns.forEach(({ regex, rel, conf }) => {
        const match = regex.exec(sentence);
        if (match && match[1] && match[2]) {
          const e1 = match[1].trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
          const e2 = match[2].trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');

          if (e1.length >= 2 && e2.length >= 2 && e1.toLowerCase() !== e2.toLowerCase()) {
            relationships.push({
              sourceEntityName: this.capitalizeWords(e1),
              relationshipType: rel,
              targetEntityName: this.capitalizeWords(e2),
              confidenceScore: conf,
              context: sentence.trim()
            });
          }
        }
      });
    });

    // Known Entity Pairwise Proximity Matching
    if (knownEntities.length >= 2) {
      for (let i = 0; i < knownEntities.length; i++) {
        for (let j = i + 1; j < knownEntities.length; j++) {
          const ent1 = knownEntities[i];
          const ent2 = knownEntities[j];

          sentences.forEach((sentence) => {
            const hasE1 = new RegExp(`\\b${ent1.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(sentence);
            const hasE2 = new RegExp(`\\b${ent2.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(sentence);

            if (hasE1 && hasE2) {
              const lower = sentence.toLowerCase();
              let relType: RelationshipType = 'relates_to';
              if (lower.includes('cause') || lower.includes('result') || lower.includes('lead')) relType = 'causes';
              else if (lower.includes('type of') || lower.includes('is a')) relType = 'is_a';
              else if (lower.includes('part') || lower.includes('component')) relType = 'part_of';
              else if (lower.includes('use') || lower.includes('using')) relType = 'uses';

              relationships.push({
                sourceEntityName: ent1.name,
                relationshipType: relType,
                targetEntityName: ent2.name,
                confidenceScore: 0.78,
                context: sentence.trim()
              });
            }
          });
        }
      }
    }

    return this.cleanAndRankRelationships(relationships);
  }

  private capitalizeWords(str: string): string {
    return str
      .split(' ')
      .slice(0, 4) // max 4 words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  private cleanAndRankRelationships(list: ExtractedRelationship[]): ExtractedRelationship[] {
    const map = new Map<string, ExtractedRelationship>();

    list.forEach((item) => {
      if (
        !item.sourceEntityName ||
        !item.targetEntityName ||
        item.sourceEntityName.toLowerCase() === item.targetEntityName.toLowerCase()
      ) {
        return;
      }

      const key = `${item.sourceEntityName.toLowerCase()}::${item.relationshipType}::${item.targetEntityName.toLowerCase()}`;
      const existing = map.get(key);

      if (!existing || item.confidenceScore > existing.confidenceScore) {
        map.set(key, {
          sourceEntityName: item.sourceEntityName.trim(),
          relationshipType: (item.relationshipType as RelationshipType) || 'relates_to',
          targetEntityName: item.targetEntityName.trim(),
          confidenceScore: parseFloat(Math.min(1.0, Math.max(0.5, item.confidenceScore || 0.75)).toFixed(2)),
          context: item.context || ''
        });
      }
    });

    const results = Array.from(map.values());
    results.sort((a, b) => b.confidenceScore - a.confidenceScore);
    return results;
  }
}
