import random
import re


class QuestionGenerator:
    def __init__(self):
        pass

    def generate_questions(
        self,
        entities: list[tuple[str, str, str, float]],
        relationships: list[tuple[str, str, str, float]],
        content_text: str
    ) -> list[dict]:
        """
        Generates structured questions of 4 types:
        - multiple_choice
        - fill_in_blank
        - true_false
        - short_answer
        Returns list of question dicts.
        """
        questions = []
        if not entities:
            return []

        # Map entities by type for smart distractor selection
        type_to_entities = {}
        all_entity_names = []
        entity_context_map = {}

        for name, ent_type, context, imp in entities:
            all_entity_names.append(name)
            entity_context_map[name] = context
            if ent_type not in type_to_entities:
                type_to_entities[ent_type] = []
            type_to_entities[ent_type].append(name)

        # 1. Multiple Choice Questions
        for name, ent_type, context, imp in entities[:5]:
            # Distractor selection: prefer SAME entity_type
            same_type_candidates = [e for e in type_to_entities.get(ent_type, []) if e != name]
            other_candidates = [e for e in all_entity_names if e != name and e not in same_type_candidates]
            
            distractors = same_type_candidates.copy()
            if len(distractors) < 3:
                needed = 3 - len(distractors)
                distractors.extend(random.sample(other_candidates, min(needed, len(other_candidates))))

            if len(distractors) < 3:
                # Add default domain distractors if needed
                generic_distractors = ["Spaced Repetition", "Neural Network", "Active Recall", "TextRank"]
                for g in generic_distractors:
                    if g != name and g not in distractors and len(distractors) < 3:
                        distractors.append(g)

            choices = distractors[:3] + [name]
            random.shuffle(choices)

            prompt = f"In the context of studying {ent_type.lower()}, which term is associated with: '{context}'?"
            if len(prompt) > 200:
                prompt = f"Which concept relates to: '{context[:140]}...'?"

            questions.append({
                "question_type": "multiple_choice",
                "prompt": prompt,
                "correct_answer": name,
                "choices": choices,
                "target_entity": name,
                "explanation": f"'{name}' is identified as a key {ent_type.lower()} in the context."
            })

        # 2. Fill In Blank Questions
        for name, ent_type, context, imp in entities[:5]:
            if name in context:
                blanked_sentence = context.replace(name, "__________")
                questions.append({
                    "question_type": "fill_in_blank",
                    "prompt": f"Fill in the blank: {blanked_sentence}",
                    "correct_answer": name,
                    "choices": [name],
                    "target_entity": name,
                    "explanation": f"The sentence originates from the text with '{name}' as the primary term."
                })

        # 3. True / False Questions
        # Generate genuine false statements ~50% of time by substituting entity or negating relationship
        for e1, rel, e2, conf in relationships[:6]:
            is_true = random.choice([True, False])
            
            if is_true:
                statement = f"True or False: {e1} {rel.replace('_', ' ')} {e2}."
                answer = "True"
                explanation = f"Correct. According to the knowledge graph, {e1} {rel.replace('_', ' ')} {e2}."
            else:
                # Generate false statement: substitute e2 with another entity
                alt_entities = [e for e in all_entity_names if e != e1 and e != e2]
                false_e2 = random.choice(alt_entities) if alt_entities else "Unrelated Concept"
                statement = f"True or False: {e1} {rel.replace('_', ' ')} {false_e2}."
                answer = "False"
                explanation = f"False. In reality, {e1} {rel.replace('_', ' ')} {e2}, not {false_e2}."

            questions.append({
                "question_type": "true_false",
                "prompt": statement,
                "correct_answer": answer,
                "choices": ["True", "False"],
                "target_entity": e1,
                "explanation": explanation
            })

        # 4. Short Answer Questions
        for name, ent_type, context, imp in entities[:3]:
            questions.append({
                "question_type": "short_answer",
                "prompt": f"Explain the role or definition of '{name}' as described in the source material.",
                "correct_answer": context,
                "choices": [],
                "target_entity": name,
                "explanation": f"Key context sentence: {context}"
            })

        return questions
