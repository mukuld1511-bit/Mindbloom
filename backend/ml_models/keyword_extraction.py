import re
import math
from collections import defaultdict
import networkx as nx

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
except ImportError:
    TfidfVectorizer = None


STOP_WORDS = set([
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
    "can", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't",
    "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers",
    "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if",
    "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most",
    "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
    "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd",
    "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's",
    "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they",
    "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under",
    "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
    "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who",
    "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd",
    "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves", "also", "using", "used"
])


class KeywordExtractor:
    def __init__(self):
        pass

    def _tokenize(self, text: str) -> list[str]:
        tokens = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        return [t for t in tokens if t not in STOP_WORDS]

    def _compute_tfidf_scores(self, text: str) -> dict[str, float]:
        """
        Fits TfidfVectorizer on paragraphs as pseudo-documents to compute real IDF.
        """
        paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 20]
        if len(paragraphs) < 2:
            # Split into sentence chunks if not enough paragraphs
            sentences = re.split(r'(?<=[.!?])\s+', text)
            paragraphs = [" ".join(sentences[i:i+3]) for i in range(0, len(sentences), 3) if sentences[i:i+3]]

        if not paragraphs:
            paragraphs = [text]

        tfidf_scores = defaultdict(float)

        if TfidfVectorizer is not None and len(paragraphs) > 0:
            try:
                vectorizer = TfidfVectorizer(stop_words='english', token_pattern=r'\b[a-zA-Z]{3,}\b')
                tfidf_matrix = vectorizer.fit_transform(paragraphs)
                feature_names = vectorizer.get_feature_names_out()

                # Sum TF-IDF scores across pseudo-documents
                dense_sum = tfidf_matrix.sum(axis=0).A1
                max_score = max(dense_sum) if len(dense_sum) > 0 and max(dense_sum) > 0 else 1.0

                for word, score in zip(feature_names, dense_sum):
                    if word not in STOP_WORDS:
                        tfidf_scores[word] = score / max_score
                return tfidf_scores
            except Exception:
                pass

        # Fallback term frequency calculation
        tokens = self._tokenize(text)
        if not tokens:
            return {}
        counts = defaultdict(int)
        for t in tokens:
            counts[t] += 1
        max_c = max(counts.values())
        for word, count in counts.items():
            tfidf_scores[word] = count / max_c
        return tfidf_scores

    def _compute_textrank_scores(self, text: str, window_size: int = 4) -> dict[str, float]:
        """
        TextRank graph via NetworkX (word co-occurrence window=4, nx.pagerank dampening=0.85).
        """
        tokens = self._tokenize(text)
        if not tokens:
            return {}

        graph = nx.Graph()
        for token in tokens:
            graph.add_node(token)

        # Build co-occurrence edges within window_size
        for i, token in enumerate(tokens):
            for j in range(i + 1, min(i + window_size, len(tokens))):
                neighbor = tokens[j]
                if token != neighbor:
                    if graph.has_edge(token, neighbor):
                        graph[token][neighbor]['weight'] += 1.0
                    else:
                        graph.add_edge(token, neighbor, weight=1.0)

        if len(graph.nodes) == 0:
            return {}

        try:
            pagerank_scores = nx.pagerank(graph, alpha=0.85, max_iter=100)
            max_pr = max(pagerank_scores.values()) if pagerank_scores else 1.0
            return {node: score / max_pr for node, score in pagerank_scores.items()}
        except Exception:
            # Fallback uniform score
            return {node: 1.0 / len(graph.nodes) for node in graph.nodes}

    def extract_keywords(self, text: str, top_n: int = 10) -> list[tuple[str, float]]:
        """
        Combines TF-IDF (0.5) + TextRank (0.5) to produce top-N keywords.
        Returns: list of (word, combined_score)
        """
        if not text or not text.strip():
            return []

        tfidf_scores = self._compute_tfidf_scores(text)
        textrank_scores = self._compute_textrank_scores(text)

        all_words = set(tfidf_scores.keys()).union(set(textrank_scores.keys()))
        combined = []

        for word in all_words:
            tf_score = tfidf_scores.get(word, 0.0)
            tr_score = textrank_scores.get(word, 0.0)
            final_score = round(0.5 * tf_score + 0.5 * tr_score, 3)
            combined.append((word, final_score))

        combined.sort(key=lambda x: x[1], reverse=True)
        return combined[:top_n]
