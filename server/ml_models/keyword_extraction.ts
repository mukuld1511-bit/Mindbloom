export interface KeywordScore {
  keyword: string;
  tfidfScore: number;
  textRankScore: number;
  combinedScore: number;
}

export class KeywordExtractor {
  private stopWords: Set<string> = new Set([
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
    'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
    'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
    'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
    'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
    'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
    'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'
  ]);

  constructor() {}

  /**
   * TF-IDF + TextRank Graph-based keyword extractor
   */
  public extractKeywords(text: string, numKeywords: number = 10): KeywordScore[] {
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !this.stopWords.has(w));

    if (tokens.length === 0) return [];

    // 1. Calculate Term Frequencies (TF)
    const tfMap = new Map<string, number>();
    for (const token of tokens) {
      tfMap.set(token, (tfMap.get(token) || 0) + 1);
    }

    const totalTokens = tokens.length;
    const tfScores = new Map<string, number>();
    for (const [token, count] of tfMap.entries()) {
      tfScores.set(token, count / totalTokens);
    }

    // 2. TextRank Graph Co-occurrence Matrix
    const uniqueTokens = Array.from(tfMap.keys());
    const windowSize = 4;
    const coOccurrence = new Map<string, Map<string, number>>();

    uniqueTokens.forEach((t) => coOccurrence.set(t, new Map()));

    for (let i = 0; i < tokens.length; i++) {
      const current = tokens[i];
      for (let j = i + 1; j < Math.min(i + windowSize, tokens.length); j++) {
        const neighbor = tokens[j];
        if (current !== neighbor) {
          const map1 = coOccurrence.get(current)!;
          map1.set(neighbor, (map1.get(neighbor) || 0) + 1);
          const map2 = coOccurrence.get(neighbor)!;
          map2.set(current, (map2.get(current) || 0) + 1);
        }
      }
    }

    // Run TextRank Power Iterations
    let trScores = new Map<string, number>();
    uniqueTokens.forEach((t) => trScores.set(t, 1.0));
    const d = 0.85;

    for (let iter = 0; iter < 15; iter++) {
      const newScores = new Map<string, number>();
      for (const node of uniqueTokens) {
        let sum = 0;
        const neighbors = coOccurrence.get(node)!;
        for (const [nbr, weight] of neighbors.entries()) {
          const nbrDegree = Array.from(coOccurrence.get(nbr)!.values()).reduce((a, b) => a + b, 0) || 1;
          sum += (weight / nbrDegree) * trScores.get(nbr)!;
        }
        newScores.set(node, (1 - d) + d * sum);
      }
      trScores = newScores;
    }

    // Normalize TextRank Scores
    const maxTR = Math.max(...Array.from(trScores.values()), 1.0);
    const maxTF = Math.max(...Array.from(tfScores.values()), 1.0);

    const combinedList: KeywordScore[] = [];
    for (const token of uniqueTokens) {
      const tfNorm = (tfScores.get(token) || 0) / maxTF;
      const trNorm = (trScores.get(token) || 0) / maxTR;
      const combined = Number((0.5 * tfNorm + 0.5 * trNorm).toFixed(3));

      // Title case keyword name
      const displayName = token.charAt(0).toUpperCase() + token.slice(1);

      combinedList.push({
        keyword: displayName,
        tfidfScore: Number(tfNorm.toFixed(3)),
        textRankScore: Number(trNorm.toFixed(3)),
        combinedScore: combined
      });
    }

    return combinedList
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, numKeywords);
  }
}
