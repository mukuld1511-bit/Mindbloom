import os
import json
from datetime import datetime, timezone
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel
from typing import List

from backend.database import SessionLocal, Source, Entity, Relationship, Question

load_dotenv()

class ExtractedEntity(BaseModel):
    name: str
    type: str
    context: str
    importance: float

class ExtractedRelationship(BaseModel):
    source_entity: str
    target_entity: str
    relation_type: str
    confidence: float

class GeneratedQuestion(BaseModel):
    question_type: str
    prompt: str
    correct_answer: str
    choices: List[str]
    explanation: str
    difficulty: float

class GeminiResponse(BaseModel):
    human_summary: str
    entities: List[ExtractedEntity]
    relationships: List[ExtractedRelationship]
    questions: List[GeneratedQuestion]

class ContentProcessor:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        if self.api_key and self.api_key != "MY_GEMINI_API_KEY":
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None

    def process_content(self, title: str, content: str, source_url: str = None) -> dict:
        if not content or not content.strip():
            return {"error": "Content cannot be empty"}

        if not self.client:
            return {"error": "GEMINI_API_KEY not configured. Please set it in your .env file."}

        # 1. Call Gemini to process everything
        prompt = f"""
You are an expert knowledge extraction AI. Analyze the following text and extract structured information.
1. Create a human_summary: A simple, conversational 3-bullet point summary of the key takeaways. Format it with bullet points (•).
2. Extract the core entities (concepts, ideas, people, tools). For type, use terms like 'Concept', 'Idea', 'Person'. Context should be a brief definition. Importance 1.0-2.0.
3. Extract relationships between these entities (e.g. causes, is_part_of, related_to, created).
4. Generate 2-3 high-quality spaced-repetition flashcards (multiple_choice or true_false) based on the core facts.

Text to analyze:
{content}
"""
        
        try:
            response = self.client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config={
                    'response_mime_type': 'application/json',
                    'response_schema': GeminiResponse,
                    'temperature': 0.1
                },
            )
            
            result = response.parsed
            
            if not result:
                # Fallback if parsed is None
                result = GeminiResponse.model_validate_json(response.text)
                
        except Exception as e:
            return {"error": f"Failed to call Gemini API: {str(e)}"}

        # 2. Persist to database
        db = SessionLocal()
        try:
            # Create Source
            source = Source(
                title=title or (content[:40] + "..."),
                content=content,
                source_url=source_url,
                human_summary=result.human_summary
            )
            db.add(source)
            db.flush()

            # Save Entities
            entity_objs = []
            for e in result.entities:
                ent_obj = Entity(
                    source_id=source.id,
                    name=e.name,
                    type=e.type,
                    context=e.context,
                    importance=e.importance
                )
                entity_objs.append(ent_obj)
            db.add_all(entity_objs)

            # Save Relationships
            rel_objs = []
            for r in result.relationships:
                rel_obj = Relationship(
                    source_entity=r.source_entity,
                    target_entity=r.target_entity,
                    relation_type=r.relation_type,
                    confidence=r.confidence
                )
                rel_objs.append(rel_obj)
            db.add_all(rel_objs)

            # Save Questions
            question_objs = []
            for q in result.questions:
                choices_str = "|".join(q.choices)
                q_obj = Question(
                    source_id=source.id,
                    question_type=q.question_type,
                    prompt=q.prompt,
                    correct_answer=q.correct_answer,
                    choices=choices_str,
                    target_entity="",
                    explanation=q.explanation,
                    difficulty=q.difficulty,
                    next_review_date=datetime.now(timezone.utc)
                )
                question_objs.append(q_obj)

            db.add_all(question_objs)
            db.commit()

            return {
                "status": "success",
                "source_id": source.id,
                "title": source.title,
                "entities_count": len(result.entities),
                "relationships_count": len(result.relationships),
                "questions_generated": len(result.questions),
                "created_at": source.created_at.isoformat()
            }
        except Exception as e:
            db.rollback()
            return {"error": f"Database error: {str(e)}"}
        finally:
            db.close()
