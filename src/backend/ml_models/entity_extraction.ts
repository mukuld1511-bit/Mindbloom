import { EntityType } from '../../types.js';
import { GoogleGenAI, Type } from '@google/genai';

export interface RawEntity {
  name: string;
  type: EntityType;
  context: string;
  frequency: number;
  specificity: number;
  importanceScore: number;
}

export class EntityExtractor {
  private stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'against', 'between',
    'into', 'through', 'during', 'before', 'after', 'above', 'below', 'from', 'up',
    'down', 'of', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'this',
    'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'us', 'our'
  ]);

  private getAiClient() {
    if (process.env.GEMINI_API_KEY) {
      return new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
    }
    return null;
  }

  public async extract_entities(text: string): Promise<RawEntity[]> {
    if (!text || text.trim().length === 0) return [];

    // Attempt Gemini AI extraction if API key is present
    const ai = this.getAiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Analyze the following educational or scientific text and extract key entities. 
For each entity, determine:
1. name: string
2. type: ONE OF ['PERSON', 'ORG', 'PRODUCT', 'CONCEPT', 'LOCATION', 'DATE', 'TOPIC', 'PRINCIPLE', 'METHOD', 'RESULT']
3. context: a brief sentence snippet showing how it is used.
4. specificity: float 0.1-1.0 (how specialized or domain-specific the term is)

Text:
"""${text.slice(0, 4000)}"""`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  type: { type: Type.STRING },
                  context: { type: Type.STRING },
                  specificity: { type: Type.NUMBER }
                },
                required: ['name', 'type', 'context']
              }
            }
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            return this.rankAndFilterEntities(parsed, text);
          }
        }
      } catch (err) {
        console.warn('AI entity extraction fallback to rule-based NLP:', err);
      }
    }

    // Rule-based & Pattern NLP Extraction (SpaCy pattern simulation)
    return this.ruleBasedExtraction(text);
  }

  private ruleBasedExtraction(text: string): RawEntity[] {
    const rawMatches: { name: string; type: EntityType; context: string; specificity: number }[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);

    // 1. Capitalized Multi-word Phrases (PERSON, ORG, CONCEPT, LOCATION)
    const multiWordCapRegex = /\b([A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)+)\b/g;
    // 2. Technical concepts in quotes or title-case
    const technicalTerms = /\b([A-Z][a-zA-Z0-9\-_]{2,}(?:\s+[a-zA-Z0-9\-_]+){0,2})\b/g;
    // 3. Date pattern
    const dateRegex = /\b(\d{4}|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s+\d{4})?)\b/gi;
    // 4. Method / Principle indicator patterns
    const methodRegex = /\b([a-zA-Z\-]+(?:\s+[a-zA-Z\-]+)?\s+(?:algorithm|method|model|framework|protocol|process|technique|architecture))\b/gi;
    const principleRegex = /\b([a-zA-Z\-]+(?:\s+[a-zA-Z\-]+)?\s+(?:principle|law|theory|rule|theorem|hypothesis))\b/gi;
    const resultRegex = /\b([a-zA-Z\-]+(?:\s+[a-zA-Z\-]+)?\s+(?:accuracy|performance|outcome|finding|result|yield|throughput))\b/gi;

    sentences.forEach((sentence) => {
      // Date matching
      let m: RegExpExecArray | null;
      while ((m = dateRegex.exec(sentence)) !== null) {
        if (m[1].length > 3) {
          rawMatches.push({
            name: m[1],
            type: 'DATE',
            context: sentence.trim(),
            specificity: 0.6
          });
        }
      }

      // Method matching
      while ((m = methodRegex.exec(sentence)) !== null) {
        rawMatches.push({
          name: this.cleanName(m[1]),
          type: 'METHOD',
          context: sentence.trim(),
          specificity: 0.85
        });
      }

      // Principle matching
      while ((m = principleRegex.exec(sentence)) !== null) {
        rawMatches.push({
          name: this.cleanName(m[1]),
          type: 'PRINCIPLE',
          context: sentence.trim(),
          specificity: 0.9
        });
      }

      // Result matching
      while ((m = resultRegex.exec(sentence)) !== null) {
        rawMatches.push({
          name: this.cleanName(m[1]),
          type: 'RESULT',
          context: sentence.trim(),
          specificity: 0.75
        });
      }

      // Capitalized multi-word matching
      while ((m = multiWordCapRegex.exec(sentence)) !== null) {
        const name = this.cleanName(m[1]);
        if (!this.isStopPhrase(name)) {
          const type = this.classifyCapEntity(name);
          rawMatches.push({
            name,
            type,
            context: sentence.trim(),
            specificity: 0.8
          });
        }
      }

      // Single word prominent technical noun detection
      while ((m = technicalTerms.exec(sentence)) !== null) {
        const name = this.cleanName(m[1]);
        if (name.length > 3 && !this.isStopPhrase(name) && !this.stopWords.has(name.toLowerCase())) {
          rawMatches.push({
            name,
            type: 'CONCEPT',
            context: sentence.trim(),
            specificity: 0.7
          });
        }
      }
    });

    return this.rankAndFilterEntities(rawMatches, text);
  }

  private classifyCapEntity(name: string): EntityType {
    const lower = name.toLowerCase();
    if (lower.includes('university') || lower.includes('inc') || lower.includes('corp') || lower.includes('lab') || lower.includes('group') || lower.includes('institute')) {
      return 'ORG';
    }
    if (lower.includes('city') || lower.includes('state') || lower.includes('river') || lower.includes('mountain') || lower.includes('country')) {
      return 'LOCATION';
    }
    if (lower.includes('algorithm') || lower.includes('system') || lower.includes('engine') || lower.includes('model')) {
      return 'METHOD';
    }
    // Simple heuristic: 2 capitalized words without organizational indicators often are PERSON or CONCEPT
    const words = name.split(/\s+/);
    if (words.length === 2 && !['Theory', 'Model', 'System', 'Data', 'Network'].includes(words[1])) {
      return 'PERSON';
    }
    return 'CONCEPT';
  }

  private cleanName(name: string): string {
    return name.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
  }

  private isStopPhrase(phrase: string): boolean {
    const lower = phrase.toLowerCase().trim();
    if (lower.length < 3) return true;
    const words = lower.split(/\s+/);
    return words.every((w) => this.stopWords.has(w));
  }

  private rankAndFilterEntities(
    rawEntities: { name: string; type: EntityType; context: string; specificity?: number }[],
    fullText: string
  ): RawEntity[] {
    const map = new Map<string, { name: string; type: EntityType; context: string; frequency: number; specificity: number }>();

    rawEntities.forEach((item) => {
      const key = item.name.toLowerCase();
      if (this.isStopPhrase(item.name)) return;

      const existing = map.get(key);
      const specificity = item.specificity || (item.name.includes(' ') ? 0.8 : 0.6);

      if (existing) {
        existing.frequency += 1;
        if (item.context && item.context.length > existing.context.length) {
          existing.context = item.context;
        }
      } else {
        // Count total occurrences in text
        const regex = new RegExp(`\\b${item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = fullText.match(regex);
        const freq = matches ? matches.length : 1;

        map.set(key, {
          name: item.name,
          type: (item.type as EntityType) || 'CONCEPT',
          context: item.context || fullText.slice(0, 100),
          frequency: freq,
          specificity
        });
      }
    });

    const results: RawEntity[] = Array.from(map.values()).map((e) => {
      // Importance = Frequency * Specificity
      const importanceScore = parseFloat((e.frequency * e.specificity).toFixed(2));
      return {
        ...e,
        importanceScore
      };
    });

    // Rank descending by importanceScore
    return results.sort((a, b) => b.importanceScore - a.importanceScore);
  }
}
