import re
import math
from collections import Counter, defaultdict

try:
    import spacy
    try:
        nlp = spacy.load("en_core_web_sm")
    except Exception:
        # Download or fallback if model isn't downloaded yet
        nlp = None
except ImportError:
    nlp = None


DOMAIN_DICTIONARY = {
    "TOPIC": [
        "machine learning", "artificial intelligence", "natural language processing", "neural network",
        "data science", "spaced repetition", "knowledge graph", "cognitive science", "neuroscience",
        "deep learning", "computer vision", "algorithm", "software architecture", "psychology",
        "epistemology", "memory consolidation", "active recall"
    ],
    "PRINCIPLE": [
        "sm-2 algorithm", "forgetting curve", "ebbinghaus curve", "pareto principle", "feynman technique",
        "first principles", "spacing effect", "testing effect", "cognitive load theory", "dual coding"
    ],
    "METHOD": [
        "tf-idf", "textrank", "pagerank", "ner", "dependency parsing", "logistic regression",
        "sgd classifier", "supervised learning", "cross validation", "vectorization", "tokenization",
        "flashcard review", "contextual extraction"
    ],
    "RESULT": [
        "accuracy", "retention rate", "recall rate", "precision", "f1 score", "convergence",
        "easiness factor", "memory retention", "performance grade"
    ],
    "CONCEPT": [
        "entity", "relationship", "node", "edge", "graph density", "distractor", "prompt",
        "schema", "persistence", "working memory", "long-term memory", "synaptic plasticity"
    ]
}

TYPE_SPECIFICITY_WEIGHTS = {
    "PRINCIPLE": 1.5,
    "METHOD": 1.4,
    "RESULT": 1.3,
    "CONCEPT": 1.2,
    "TOPIC": 1.1,
    "PERSON": 1.0,
    "ORG": 1.0,
    "PRODUCT": 0.9,
    "LOCATION": 0.8,
    "DATE": 0.7,
    "MISC": 0.6
}

SPACY_LABEL_MAP = {
    "PERSON": "PERSON",
    "ORG": "ORG",
    "GPE": "LOCATION",
    "LOC": "LOCATION",
    "DATE": "DATE",
    "PRODUCT": "PRODUCT",
    "EVENT": "CONCEPT",
    "WORK_OF_ART": "CONCEPT",
    "LAW": "PRINCIPLE",
    "NORP": "TOPIC"
}


class EntityExtractor:
    def __init__(self):
        self.nlp = nlp
        # Build lookup for domain dict (case-insensitive)
        self.domain_lookup = {}
        for category, terms in DOMAIN_DICTIONARY.items():
            for term in terms:
                self.domain_lookup[term.lower()] = category

    def _split_into_sentences(self, text: str) -> list[str]:
        """Simple, robust sentence splitter."""
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]

    def extract_entities(self, text: str) -> list[tuple[str, str, str, float]]:
        """
        Extracts entities from text using spaCy NER + supplementary domain dictionary.
        Returns: list of (entity_name, entity_type, context_sentence, importance_score)
        """
        if not text or not text.strip():
            return []

        sentences = self._split_into_sentences(text)
        found_entities = []  # list of dicts: {name, type, sentence}

        # 1. Use spaCy NER if available
        if self.nlp is not None:
            doc = self.nlp(text)
            for ent in doc.ents:
                clean_name = ent.text.strip()
                if len(clean_name) < 2:
                    continue
                mapped_type = SPACY_LABEL_MAP.get(ent.label_, "CONCEPT")
                
                # Check if it overrides with a custom domain term
                if clean_name.lower() in self.domain_lookup:
                    mapped_type = self.domain_lookup[clean_name.lower()]

                context_sentence = ent.sent.text.strip() if ent.sent else text[:100]
                found_entities.append({
                    "name": clean_name,
                    "type": mapped_type,
                    "sentence": context_sentence
                })

        # 2. Match supplementary domain-term dictionary across sentences
        text_lower = text.lower()
        for sent in sentences:
            sent_lower = sent.lower()
            for term, category in self.domain_lookup.items():
                if term in sent_lower:
                    # Find exact casing in sentence
                    idx = sent_lower.find(term)
                    actual_name = sent[idx:idx + len(term)]
                    found_entities.append({
                        "name": actual_name.title() if actual_name.islower() else actual_name,
                        "type": category,
                        "sentence": sent
                    })

        # 3. Capitalized noun phrase heuristic fallback if few entities found
        if len(found_entities) < 3:
            cap_pattern = r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b'
            for sent in sentences:
                matches = re.findall(cap_pattern, sent)
                for match in matches:
                    if len(match) > 2 and match.lower() not in ["the", "this", "that", "there", "here", "with", "from"]:
                        found_entities.append({
                            "name": match,
                            "type": self.domain_lookup.get(match.lower(), "CONCEPT"),
                            "sentence": sent
                        })

        if not found_entities:
            return []

        # 4. Count frequency and associate context sentence
        freq_map = Counter()
        type_map = {}
        sentence_map = {}

        for item in found_entities:
            normalized_name = item["name"].strip()
            # Normalize casing for canonical entity key
            key = normalized_name.title() if normalized_name.islower() else normalized_name
            freq_map[key] += 1
            type_map[key] = item["type"]
            if key not in sentence_map:
                sentence_map[key] = item["sentence"]

        # 5. Calculate importance score = frequency x specificity weight
        results = []
        max_freq = max(freq_map.values()) if freq_map else 1

        for name, count in freq_map.items():
            ent_type = type_map[name]
            spec_weight = TYPE_SPECIFICITY_WEIGHTS.get(ent_type, 1.0)
            norm_freq = count / max_freq
            # Importance = frequency * specificity * length bonus
            importance = round(norm_freq * spec_weight * (1.0 + math.log(1 + len(name) / 10.0)), 3)
            context = sentence_map[name]
            results.append((name, ent_type, context, importance))

        # Sort by importance descending
        results.sort(key=lambda x: x[3], reverse=True)
        return results
