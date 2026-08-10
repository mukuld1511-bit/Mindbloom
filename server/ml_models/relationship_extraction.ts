import { ExtractedEntity } from './entity_extraction';

export interface ExtractedRelationship {
  entity1: string;
  relationshipType: 'is_a' | 'causes' | 'part_of' | 'relates_to';
  entity2: string;
  confidenceScore: number;
}

export class RelationshipExtractor {
  constructor() {}

  /**
   * Primary Path: Local Pattern & Dependency Heuristic Relationship Extractor
   */
  public extractRelationships(
    text: string,
    entities: ExtractedEntity[] = []
  ): ExtractedRelationship[] {
    const relationships: ExtractedRelationship[] = [];
    const entityNames = entities.map((e) => e.name);

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    // Pattern definitions with target relationship types
    const patterns = [
      { regex: /\b([A-Z][a-zA-Z0-9\s'’-]+?)\s+(?:is a|is an|are|defined as|is a form of)\s+([A-Z][a-zA-Z0-9\s'’-]+)\b/i, type: 'is_a' as const, conf: 0.95 },
      { regex: /\b([A-Z][a-zA-Z0-9\s'’-]+?)\s+(?:causes|leads to|results in|triggers|strengthens|weakens|enables)\s+([A-Z][a-zA-Z0-9\s'’-]+)\b/i, type: 'causes' as const, conf: 0.90 },
      { regex: /\b([A-Z][a-zA-Z0-9\s'’-]+?)\s+(?:is part of|belongs to|comprises|is located in|discovered in)\s+([A-Z][a-zA-Z0-9\s'’-]+)\b/i, type: 'part_of' as const, conf: 0.88 },
      { regex: /\b([A-Z][a-zA-Z0-9\s'’-]+?)\s+(?:relates to|interacts with|relies on|depends on|utilizes|computes)\s+([A-Z][a-zA-Z0-9\s'’-]+)\b/i, type: 'relates_to' as const, conf: 0.85 }
    ];

    for (const sentence of sentences) {
      for (const pattern of patterns) {
        const match = pattern.regex.exec(sentence);
        if (match) {
          let e1 = match[1].trim();
          let e2 = match[2].trim();

          // Clean trailing punctuation or stopwords
          e1 = e1.replace(/^(the|a|an)\s+/i, '').trim();
          e2 = e2.replace(/^(the|a|an)\s+/i, '').trim();

          if (e1.length >= 2 && e2.length >= 2 && e1.toLowerCase() !== e2.toLowerCase()) {
            // Capitalize
            const cap1 = e1.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            const cap2 = e2.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

            relationships.push({
              entity1: cap1,
              relationshipType: pattern.type,
              entity2: cap2,
              confidenceScore: pattern.conf
            });
          }
        }
      }

      // Sentence co-occurrence fallback if entities exist
      if (entities.length >= 2) {
        for (let i = 0; i < entities.length; i++) {
          for (let j = i + 1; j < entities.length; j++) {
            const name1 = entities[i].name;
            const name2 = entities[j].name;

            if (sentence.includes(name1) && sentence.includes(name2)) {
              const alreadyExists = relationships.some(
                (r) =>
                  (r.entity1 === name1 && r.entity2 === name2) ||
                  (r.entity1 === name2 && r.entity2 === name1)
              );

              if (!alreadyExists) {
                let relType: 'is_a' | 'causes' | 'part_of' | 'relates_to' = 'relates_to';
                if (sentence.toLowerCase().includes('part') || sentence.toLowerCase().includes('in')) {
                  relType = 'part_of';
                } else if (sentence.toLowerCase().includes('cause') || sentence.toLowerCase().includes('lead')) {
                  relType = 'causes';
                }

                relationships.push({
                  entity1: name1,
                  relationshipType: relType,
                  entity2: name2,
                  confidenceScore: 0.75
                });
              }
            }
          }
        }
      }
    }

    return relationships;
  }
}
