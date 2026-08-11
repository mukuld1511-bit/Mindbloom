from datetime import datetime, timezone
from backend.ml_models.entity_extraction import EntityExtractor
from backend.ml_models.keyword_extraction import KeywordExtractor
from backend.ml_models.relationship_extraction import RelationshipExtractor
from backend.ml_models.question_generator import QuestionGenerator
from backend.ml_models/difficulty_classifier import DifficultyClassifier
from backend.database import SessionLocal, Source, Entity, Relationship, Fact, Question


class ContentProcessor:
    def __init__(self):
        self.entity_extractor = EntityExtractor()
        self.keyword_extractor = KeywordExtractor()
        self.relationship_extractor = RelationshipExtractor()
        self.question_generator = QuestionGenerator()
        self.difficulty_classifier = DifficultyClassifier()

    def process_content(self, title: str, content: str, source_url: str = None) -> dict:
        """
        Full orchestration pipeline:
        keywords -> entities -> relationships -> facts -> questions -> difficulty scoring -> persist
        """
        if not content or not content.strip():
            return {"error": "Content cannot be empty"}

        # 1. Keyword extraction
        keywords = self.keyword_extractor.extract_keywords(content, top_n=10)

        # 2. Entity extraction
        entities = self.entity_extractor.extract_entities(content)

        # 3. Relationship extraction
        relationships = self.relationship_extractor.extract_relationships(content, entities)

        # 4. Question generation
        raw_questions = self.question_generator.generate_questions(entities, relationships, content)

        # 5. Persist to database
        db = SessionLocal()
        try:
            # Create Source
            source = Source(
                title=title or (content[:40] + "..."),
                content=content,
                source_url=source_url
            )
            db.add(source)
            db.flush()  # Get source.id

            # Save Entities
            entity_objs = []
            for name, ent_type, ctx, importance in entities:
                ent_obj = Entity(
                    source_id=source.id,
                    name=name,
                    type=ent_type,
                    context=ctx,
                    importance=importance
                )
                entity_objs.append(ent_obj)
            db.add_all(entity_objs)

            # Save Relationships
            rel_objs = []
            for src_e, rel_type, tgt_e, conf in relationships:
                rel_obj = Relationship(
                    source_entity=src_e,
                    target_entity=tgt_e,
                    relation_type=rel_type,
                    confidence=conf
                )
                rel_objs.append(rel_obj)
            db.add_all(rel_objs)

            # Save Questions with ML Difficulty Classifier scoring
            question_objs = []
            for q in raw_questions:
                diff_score = self.difficulty_classifier.predict_difficulty(q)
                choices_str = "|".join(q.get("choices", []))
                
                q_obj = Question(
                    source_id=source.id,
                    question_type=q["question_type"],
                    prompt=q["prompt"],
                    correct_answer=q["correct_answer"],
                    choices=choices_str,
                    target_entity=q.get("target_entity", ""),
                    explanation=q.get("explanation", ""),
                    difficulty=diff_score,
                    next_review_date=datetime.now(timezone.utc)
                )
                question_objs.append(q_obj)

            db.add_all(question_objs)
            db.commit()

            return {
                "status": "success",
                "source_id": source.id,
                "title": source.title,
                "keywords_count": len(keywords),
                "entities_count": len(entities),
                "relationships_count": len(relationships),
                "questions_generated": len(raw_questions),
                "created_at": source.created_at.isoformat()
            }
        except Exception as e:
            db.rollback()
            return {"error": str(e)}
        finally:
            db.close()
