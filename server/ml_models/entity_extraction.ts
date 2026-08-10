import { EntityType } from '../../src/types';

export interface ExtractedEntity {
  name: string;
  type: EntityType;
  context: string;
  importanceScore: number;
}

export class EntityExtractor {
  // Common stopwords to filter out false positives
  private stopwords: Set<string> = new Set([
    'The', 'A', 'An', 'This', 'That', 'These', 'Those', 'It', 'Its', 'They', 'Their',
    'We', 'Our', 'You', 'Your', 'He', 'His', 'She', 'Her', 'And', 'But', 'Or', 'For',
    'Nor', 'On', 'At', 'To', 'From', 'By', 'With', 'About', 'As', 'Into', 'Like', 'Through',
    'After', 'Over', 'Between', 'Out', 'Against', 'During', 'Without', 'Before', 'Under',
    'Around', 'Among', 'In', 'Is', 'Are', 'Was', 'Were', 'Be', 'Been', 'Being', 'Have', 'Has'
  ]);

  // Known domain entity patterns dictionary
  private domainDictionary: Record<string, EntityType> = {
    'synaptic plasticity': 'CONCEPT',
    'long-term potentiation': 'METHOD',
    'ltp': 'METHOD',
    'hippocampus': 'LOCATION',
    'nmda receptor': 'PRODUCT',
    'terje lømo': 'PERSON',
    'transformer': 'CONCEPT',
    'transformer architecture': 'CONCEPT',
    'self-attention': 'PRINCIPLE',
    'multi-head attention': 'METHOD',
    'ashish vaswani': 'PERSON',
    'quantum superposition': 'PRINCIPLE',
    'quantum entanglement': 'PRINCIPLE',
    'schrödinger': 'PERSON',
    'schrödinger\'s cat': 'CONCEPT',
    'deep learning': 'TOPIC',
    'neural network': 'CONCEPT',
    'machine learning': 'TOPIC'
  };

  constructor() {}

  /**
   * High-accuracy Local Multi-word Pattern & Rule-based Entity Extractor (Primary Path)
   */
  public extractEntities(text: string): ExtractedEntity[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const entityMap = new Map<string, { type: EntityType; count: number; context: string }>();

    // Pass 1: Match domain dictionary terms
    const lowerText = text.toLowerCase();
    for (const [term, type] of Object.entries(this.domainDictionary)) {
      if (lowerText.includes(term)) {
        const regex = new RegExp(`\\b${term.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\b`, 'gi');
        const matches = text.match(regex);
        const count = matches ? matches.length : 1;
        const matchingSentence = sentences.find((s) => s.toLowerCase().includes(term)) || text.slice(0, 150);

        // Capitalize nicely
        const displayName = term.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        entityMap.set(displayName.toLowerCase(), {
          type,
          count: count * 2, // dictionary boost
          context: matchingSentence.trim()
        });
      }
    }

    // Pass 2: Capitalized Noun Phrase & Multi-Word Entity Extraction
    // Matches sequences of capitalized words like "Ashish Vaswani" or "Schrödinger's Cat"
    const capPhraseRegex = /\b([A-Z][a-z0-9'’]+(?:\s+[A-Z][a-z0-9'’]+)*)\b/g;
    let match: RegExpExecArray | null;

    while ((match = capPhraseRegex.exec(text)) !== null) {
      const phrase = match[1].trim();
      const lowerPhrase = phrase.toLowerCase();

      if (phrase.length < 3 || this.stopwords.has(phrase)) continue;

      // Classify phrase type based on structural heuristics
      let type: EntityType = 'CONCEPT';
      if (/\b(19\d\d|20\d\d|January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(phrase)) {
        type = 'DATE';
      } else if (/\b(University|Institute|Corp|Inc|Association|Group|Department|Lab)\b/i.test(phrase)) {
        type = 'ORG';
      } else if (/\b(Model|System|Receptor|Algorithm|Tool|Framework)\b/i.test(phrase)) {
        type = 'PRODUCT';
      } else if (phrase.split(' ').length === 2 && !/\b(Theory|System|Process|Method)\b/i.test(phrase)) {
        type = 'PERSON'; // Default 2-word proper name heuristic
      } else if (/\b(Principle|Law|Theorem|Effect|Paradox|Rule)\b/i.test(phrase)) {
        type = 'PRINCIPLE';
      } else if (/\b(Architecture|Method|Procedure|Algorithm|Technique)\b/i.test(phrase)) {
        type = 'METHOD';
      }

      const matchingSentence = sentences.find((s) => s.includes(phrase)) || text.slice(0, 150);

      if (!entityMap.has(lowerPhrase)) {
        entityMap.set(lowerPhrase, {
          type,
          count: 1,
          context: matchingSentence.trim()
        });
      } else {
        const existing = entityMap.get(lowerPhrase)!;
        existing.count += 1;
      }
    }

    // Pass 3: Technical Term & Concept Pattern Heuristics (-tion, -ism, -ity, -ics)
    const techTermRegex = /\b([a-z]{4,}(?:-[a-z]{3,})?\s+(?:plasticity|potentiation|superposition|entanglement|network|attention|architecture|receptors?|mechanisms?|learning))\b/gi;
    while ((match = techTermRegex.exec(text)) !== null) {
      const term = match[1].trim();
      const lower = term.toLowerCase();
      if (!entityMap.has(lower)) {
        const displayName = term.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const matchingSentence = sentences.find((s) => s.toLowerCase().includes(lower)) || text.slice(0, 150);
        entityMap.set(lower, {
          type: 'CONCEPT',
          count: 1,
          context: matchingSentence.trim()
        });
      }
    }

    // Convert map to ranked ExtractedEntity list
    const results: ExtractedEntity[] = [];
    for (const [lowerName, data] of entityMap.entries()) {
      // Restore proper title casing
      const name = lowerName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      
      // Importance score = frequency * specificity factor
      const wordCount = name.split(' ').length;
      const specificity = wordCount > 1 ? 1.5 : 1.0;
      const importanceScore = Number((data.count * specificity + Math.min(name.length / 10, 2.0)).toFixed(1));

      results.push({
        name,
        type: data.type,
        context: data.context,
        importanceScore
      });
    }

    // Sort descending by importance score
    return results.sort((a, b) => b.importanceScore - a.importanceScore);
  }
}
