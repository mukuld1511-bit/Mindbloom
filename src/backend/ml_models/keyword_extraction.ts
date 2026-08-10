import { Keyword } from '../../types.js';

export class KeywordExtractor {
  private stopWords = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
    'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before', 'being',
    'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot', 'could',
    'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down',
    'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t',
    'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here',
    'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d',
    'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its',
    'itself', 'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor',
    'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours',
    'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll',
    'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s',
    'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s',
    'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those',
    'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we',
    'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s',
    'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom',
    'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll',
    'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves', 'also', 'using',
    'used', 'can', 'may', 'one', 'two', 'also', 'figure', 'table', 'section', 'paper'
  ]);

  public extract_keywords(text: string, numKeywords: number = 10): Keyword[] {
    if (!text || text.trim().length === 0) return [];

    const cleanedText = text.toLowerCase();
    const sentences = cleanedText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.replace(/[^a-z0-9\s-]/g, '').trim())
      .filter((s) => s.length > 0);

    const words = cleanedText
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !this.stopWords.has(w) && !/^\d+$/.test(w));

    if (words.length === 0) return [];

    // 1. Calculate TF-IDF (Term Frequency - Inverse Document Frequency across sentences)
    const tfMap = new Map<string, number>();
    words.forEach((w) => tfMap.set(w, (tfMap.get(w) || 0) + 1));

    const totalWords = words.length;
    const numSentences = Math.max(1, sentences.length);
    const docFreqMap = new Map<string, number>();

    tfMap.forEach((_, word) => {
      let countInSentences = 0;
      sentences.forEach((sentence) => {
        if (sentence.includes(word)) countInSentences++;
      });
      docFreqMap.set(word, Math.max(1, countInSentences));
    });

    const tfidfScores = new Map<string, number>();
    let maxTfidf = 0.0001;

    tfMap.forEach((tf, word) => {
      const termFreq = tf / totalWords;
      const idf = Math.log(numSentences / (docFreqMap.get(word) || 1)) + 1;
      const tfidf = termFreq * idf;
      tfidfScores.set(word, tfidf);
      if (tfidf > maxTfidf) maxTfidf = tfidf;
    });

    // 2. TextRank Algorithm (Graph Centrality on Word Co-occurrence Window = 4)
    const textRankScores = this.calculateTextRank(sentences, Array.from(tfMap.keys()));

    let maxTextRank = 0.0001;
    textRankScores.forEach((score) => {
      if (score > maxTextRank) maxTextRank = score;
    });

    // 3. Combine TF-IDF (50%) + TextRank (50%)
    const combinedList: Keyword[] = [];
    tfMap.forEach((_, word) => {
      const normTfidf = (tfidfScores.get(word) || 0) / maxTfidf;
      const normTextRank = (textRankScores.get(word) || 0) / maxTextRank;
      const combinedScore = parseFloat((0.5 * normTfidf + 0.5 * normTextRank).toFixed(4));

      combinedList.push({
        keyword: word,
        tfidfScore: parseFloat(normTfidf.toFixed(4)),
        textRankScore: parseFloat(normTextRank.toFixed(4)),
        combinedScore
      });
    });

    // Sort by combined score descending
    combinedList.sort((a, b) => b.combinedScore - a.combinedScore);

    return combinedList.slice(0, numKeywords);
  }

  private calculateTextRank(sentences: string[], vocabulary: string[]): Map<string, number> {
    const vocabSet = new Set(vocabulary);
    const windowSize = 4;
    const cooccurrenceMap = new Map<string, Map<string, number>>();

    vocabulary.forEach((v) => cooccurrenceMap.set(v, new Map()));

    // Build co-occurrence graph
    sentences.forEach((sentence) => {
      const tokens = sentence
        .split(/\s+/)
        .filter((w) => vocabSet.has(w));

      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < Math.min(tokens.length, i + windowSize); j++) {
          const w1 = tokens[i];
          const w2 = tokens[j];
          if (w1 !== w2) {
            const m1 = cooccurrenceMap.get(w1);
            if (m1) m1.set(w2, (m1.get(w2) || 0) + 1);

            const m2 = cooccurrenceMap.get(w2);
            if (m2) m2.set(w1, (m2.get(w1) || 0) + 1);
          }
        }
      }
    });

    // PageRank iteration (d = 0.85, max_iter = 30)
    const damping = 0.85;
    const scores = new Map<string, number>();
    vocabulary.forEach((v) => scores.set(v, 1.0));

    for (let iter = 0; iter < 30; iter++) {
      vocabulary.forEach((vi) => {
        const neighbors = cooccurrenceMap.get(vi);
        let rankSum = 0;

        if (neighbors) {
          neighbors.forEach((weight, vj) => {
            const vjNeighbors = cooccurrenceMap.get(vj);
            let totalWeightVj = 0;
            if (vjNeighbors) {
              vjNeighbors.forEach((w) => (totalWeightVj += w));
            }
            if (totalWeightVj > 0) {
              rankSum += (weight / totalWeightVj) * (scores.get(vj) || 1.0);
            }
          });
        }

        scores.set(vi, (1 - damping) + damping * rankSum);
      });
    }

    return scores;
  }
}
