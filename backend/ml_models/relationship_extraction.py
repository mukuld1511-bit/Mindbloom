import re

try:
    import spacy
    try:
        nlp = spacy.load("en_core_web_sm")
    except Exception:
        nlp = None
except ImportError:
    nlp = None


RELATION_TYPES = ["is_a", "causes", "part_of", "relates_to"]

COPULA_PATTERNS = [
    r'\b(?P<ent1>[\w\s]+?)\s+(?:is|are|was|were)\s+(?:a|an|the)?\s+(?P<ent2>[\w\s]+)\b',
    r'\b(?P<ent1>[\w\s]+?)\s+refers to\s+(?P<ent2>[\w\s]+)\b',
    r'\b(?P<ent1>[\w\s]+?)\s+is defined as\s+(?P<ent2>[\w\s]+)\b'
]

CAUSES_PATTERNS = [
    r'\b(?P<ent1>[\w\s]+?)\s+(?:causes|leads to|results in|triggers|produces|enhances)\s+(?P<ent2>[\w\s]+)\b',
    r'\b(?P<ent2>[\w\s]+?)\s+is caused by\s+(?P<ent1>[\w\s]+)\b'
]

PART_OF_PATTERNS = [
    r'\b(?P<ent1>[\w\s]+?)\s+(?:is part of|belongs to|is component of|consists of)\s+(?P<ent2>[\w\s]+)\b',
    r'\b(?P<ent2>[\w\s]+?)\s+includes\s+(?P<ent1>[\w\s]+)\b'
]


class RelationshipExtractor:
    def __init__(self):
        self.nlp = nlp

    def _split_sentences(self, text: str) -> list[str]:
        return [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]

    def extract_relationships(
        self,
        text: str,
        entities: list[tuple[str, str, str, float]] | list[dict]
    ) -> list[tuple[str, str, str, float]]:
        """
        Extracts relationships between entities in text.
        Primary: spaCy dependency parsing (subj-verb-obj, copula 'is a').
        Fallback: same-sentence entity co-occurrence (confidence 0.75).
        Returns: list of (entity1, rel_type, entity2, confidence)
        """
        if not text or not entities:
            return []

        # Standardize entity names list
        entity_names = []
        for e in entities:
            if isinstance(e, tuple):
                entity_names.append(e[0])
            elif isinstance(e, dict):
                entity_names.append(e.get("name") or e.get("entity_name"))

        # Deduplicate & filter
        entity_names = list(set([e for e in entity_names if len(e) > 1]))
        if len(entity_names) < 2:
            return []

        relationships = []
        seen_pairs = set()

        sentences = self._split_sentences(text)

        # 1. Dependency-parse extraction if spaCy is available
        if self.nlp is not None:
            doc = self.nlp(text)
            for sent in doc.sents:
                sent_text = sent.text
                found_in_sent = [e for e in entity_names if e.lower() in sent_text.lower()]
                if len(found_in_sent) >= 2:
                    # Look for subject-verb-object or copula inside sentence
                    for i in range(len(found_in_sent)):
                        for j in range(len(found_in_sent)):
                            if i == j:
                                continue
                            e1, e2 = found_in_sent[i], found_in_sent[j]
                            pair_key = (e1.lower(), e2.lower())
                            if pair_key in seen_pairs:
                                continue

                            # Check for "is a" / copula in text segment
                            subtext = sent_text.lower()
                            if f"{e1.lower()} is" in subtext or f"{e1.lower()} are" in subtext or "defined as" in subtext:
                                relationships.append((e1, "is_a", e2, 0.90))
                                seen_pairs.add(pair_key)
                            elif "leads to" in subtext or "causes" in subtext or "results in" in subtext:
                                relationships.append((e1, "causes", e2, 0.88))
                                seen_pairs.add(pair_key)
                            elif "part of" in subtext or "consists of" in subtext or "includes" in subtext:
                                relationships.append((e1, "part_of", e2, 0.85))
                                seen_pairs.add(pair_key)

        # 2. Pattern-matching extraction on sentences
        for sent in sentences:
            sent_lower = sent.lower()
            found_in_sent = [e for e in entity_names if e.lower() in sent_lower]
            if len(found_in_sent) >= 2:
                for i in range(len(found_in_sent)):
                    for j in range(i + 1, len(found_in_sent)):
                        e1, e2 = found_in_sent[i], found_in_sent[j]
                        pair_key = (e1.lower(), e2.lower())
                        rev_pair_key = (e2.lower(), e1.lower())

                        if pair_key in seen_pairs or rev_pair_key in seen_pairs:
                            continue

                        # Check causes
                        if any(term in sent_lower for term in ["causes", "leads to", "triggers", "improves", "enhances"]):
                            rel_type = "causes"
                            conf = 0.82
                        elif any(term in sent_lower for term in ["is a", "is an", "refers to", "defined as"]):
                            rel_type = "is_a"
                            conf = 0.85
                        elif any(term in sent_lower for term in ["part of", "component of", "contains", "includes"]):
                            rel_type = "part_of"
                            conf = 0.80
                        else:
                            rel_type = "relates_to"
                            conf = 0.75  # Fallback same-sentence entity co-occurrence confidence

                        relationships.append((e1, rel_type, e2, conf))
                        seen_pairs.add(pair_key)

        return relationships
