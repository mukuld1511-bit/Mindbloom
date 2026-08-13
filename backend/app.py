import os
import io
import zipfile
from pathlib import Path
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.database import (
    init_db, SessionLocal, Source, Entity, Relationship, Question, QuizHistory, MLModelLog
)
from backend.knowledge_graph import KnowledgeGraph
from backend.content_processor import ContentProcessor
from backend.ml_models.spaced_repetition import SpacedRepetitionEngine
from backend.ml_models.difficulty_classifier import DifficultyClassifier
from backend.ml_models.performance_predictor import PerformancePredictor

# Initialize database tables & seed data
init_db()

app = FastAPI(
    title="MindBloom API",
    description="Centralized Local ML/NLP Knowledge Graph & Spaced Repetition Engine",
    version="1.0.0"
)

# CORS configuration: allow web app origins and Chrome Extension origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ML Engine Instances
processor = ContentProcessor()
sm2_engine = SpacedRepetitionEngine()
difficulty_classifier = DifficultyClassifier()
performance_predictor = PerformancePredictor()


# Dependency for database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Pydantic Schemas
class SourceCreate(BaseModel):
    title: Optional[str] = None
    content: str = Field(..., min_length=1)
    sourceUrl: Optional[str] = Field(None, alias="sourceUrl")


class QuizSubmit(BaseModel):
    question_id: int
    performance_grade: float = Field(..., ge=0.0, le=1.0)
    user_answer: Optional[str] = ""


# ---------------- API ENDPOINTS ---------------- #

@app.get("/api/health")
def health_check():
    """Health check endpoint to verify connectivity from web frontend and Chrome Extension."""
    return {
        "status": "ok",
        "service": "MindBloom Backend",
        "version": "1.0.0",
        "ml_engine": "spaCy + scikit-learn + NetworkX",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/api/extension/download")
def download_extension():
    """Generates a zip file of the Chrome Extension directory on the fly."""
    extension_dir = Path(__file__).parent.parent / "extension"
    if not extension_dir.exists():
        raise HTTPException(status_code=404, detail="Extension directory not found")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(extension_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, start=extension_dir)
                zip_file.write(file_path, arcname)

    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=mindbloom-extension.zip"}
    )


@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    """System-wide metrics and stats."""
    sources_cnt = db.query(Source).count()
    entities_cnt = db.query(Entity).count()
    relationships_cnt = db.query(Relationship).count()
    questions_cnt = db.query(Question).count()
    
    now = datetime.now(timezone.utc)
    due_cnt = db.query(Question).filter(Question.next_review_date <= now).count()

    # Reconstruct graph to get density
    kg = KnowledgeGraph()
    for ent in db.query(Entity).all():
        kg.add_entity(ent.name, ent.type, ent.importance, ent.context)
    for rel in db.query(Relationship).all():
        kg.add_relationship(rel.source_entity, rel.target_entity, rel.relation_type, rel.confidence)

    graph_stats = kg.get_graph_stats()

    return {
        "sources_count": sources_cnt,
        "entities_count": entities_cnt,
        "relationships_count": relationships_cnt,
        "questions_count": questions_cnt,
        "due_questions_count": due_cnt,
        "graph_nodes": graph_stats["nodes_count"],
        "graph_edges": graph_stats["edges_count"],
        "graph_density": graph_stats["density"]
    }


@app.get("/api/knowledge-graph")
def get_knowledge_graph(db: Session = Depends(get_db)):
    """Returns exact {nodes: [...], edges: [...]} JSON shape for graph visualization."""
    kg = KnowledgeGraph()

    entities = db.query(Entity).all()
    for ent in entities:
        kg.add_entity(ent.name, ent.type, ent.importance, ent.context)

    relationships = db.query(Relationship).all()
    for rel in relationships:
        kg.add_relationship(rel.source_entity, rel.target_entity, rel.relation_type, rel.confidence)

    return kg.to_json()


@app.get("/api/entities")
def get_entities(db: Session = Depends(get_db)):
    """List extracted entities with types and importance scores."""
    entities = db.query(Entity).all()
    return [
        {
            "id": ent.id,
            "source_id": ent.source_id,
            "name": ent.name,
            "type": ent.type,
            "context": ent.context,
            "importance": ent.importance,
            "created_at": ent.created_at.isoformat() if ent.created_at else None
        }
        for ent in entities
    ]


@app.get("/api/sources")
def get_sources(db: Session = Depends(get_db)):
    """List ingested sources."""
    sources = db.query(Source).order_by(Source.created_at.desc()).all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "content": s.content[:200] + ("..." if len(s.content) > 200 else ""),
            "full_content": s.content,
            "source_url": s.source_url,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "entities_count": len(s.entities),
            "questions_count": len(s.questions),
            "extracted_concepts": [e.name for e in s.entities][:10],
            "human_summary": s.human_summary or ""
        }
        for s in sources
    ]


@app.post("/api/sources")
def create_source(payload: SourceCreate):
    """
    Ingests text, runs NLP entity/relationship/question generation, persists, and returns summary.
    Called by both web frontend and Chrome Extension.
    """
    result = processor.process_content(
        title=payload.title or "Captured Article",
        content=payload.content,
        source_url=payload.sourceUrl
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.get("/api/quiz/due")
def get_due_quiz(db: Session = Depends(get_db)):
    """Returns flashcard questions due today according to SM-2 spaced repetition."""
    now = datetime.now(timezone.utc)
    # Fetch due questions or fallback to active questions if none strictly due
    due_qs = db.query(Question).filter(Question.next_review_date <= now).all()
    if not due_qs:
        due_qs = db.query(Question).limit(10).all()

    response_items = []
    for q in due_qs:
        choices_list = q.choices.split("|") if q.choices else []
        response_items.append({
            "id": q.id,
            "question_type": q.question_type,
            "prompt": q.prompt,
            "correct_answer": q.correct_answer,
            "choices": choices_list,
            "target_entity": q.target_entity,
            "explanation": q.explanation,
            "difficulty": q.difficulty,
            "repetitions": q.repetitions,
            "easiness_factor": q.easiness_factor,
            "interval_days": q.interval_days,
            "next_review_date": q.next_review_date.isoformat() if q.next_review_date else None
        })

    return response_items


@app.post("/api/quiz/submit")
def submit_quiz_answer(payload: QuizSubmit, db: Session = Depends(get_db)):
    """
    Processes quiz grade (0.0 to 1.0) and recalculates next SM-2 review date.
    """
    q = db.query(Question).filter(Question.id == payload.question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    # Run SM-2 Spaced Repetition calculation
    review_result = sm2_engine.process_review(
        performance_grade=payload.performance_grade,
        current_reps=q.repetitions,
        current_ef=q.easiness_factor,
        current_interval=q.interval_days
    )

    # Update Question fields
    q.repetitions = review_result["repetitions"]
    q.easiness_factor = review_result["easiness_factor"]
    q.interval_days = review_result["interval_days"]
    q.next_review_date = datetime.fromisoformat(review_result["next_review_date"])
    q.last_reviewed_at = datetime.fromisoformat(review_result["last_reviewed_at"])

    # Log Quiz History for ML retraining
    q_history = QuizHistory(
        user_id=1,
        question_id=q.id,
        user_answer=payload.user_answer,
        performance_grade=payload.performance_grade,
        quality_score=review_result["quality"],
        reviewed_at=datetime.now(timezone.utc)
    )
    db.add(q_history)
    db.commit()

    return {
        "status": "success",
        "question_id": q.id,
        "quality_score": review_result["quality"],
        "next_review_in_days": review_result["interval_days"],
        "next_review_date": review_result["next_review_date"],
        "new_easiness_factor": review_result["easiness_factor"]
    }


@app.get("/api/predictions/learning-curve")
def get_learning_curve_prediction(db: Session = Depends(get_db)):
    """Returns 30-day retention curve projection."""
    histories = db.query(QuizHistory).all()
    avg_grade = 0.80
    if histories:
        avg_grade = sum(h.performance_grade for h in histories) / len(histories)

    projections = performance_predictor.predict_learning_curve(user_avg_performance=avg_grade)
    return {
        "user_avg_performance": round(avg_grade, 2),
        "projections": projections
    }


@app.post("/api/ml/train")
def train_ml_models(db: Session = Depends(get_db)):
    """
    Triggers model training on quiz_history joined with question features.
    Reports training loss & 20% holdout validation accuracy/loss.
    """
    # Build dataset from QuizHistory joined to Question
    histories = db.query(QuizHistory).all()
    quiz_records = []
    
    for h in histories:
        q = db.query(Question).filter(Question.id == h.question_id).first()
        if q:
            quiz_records.append({
                "prompt": q.prompt,
                "question_type": q.question_type,
                "entity_frequency": 2,
                "performance_grade": h.performance_grade,
                "difficulty": q.difficulty,
                "days_since_review": (datetime.now(timezone.utc) - (q.last_reviewed_at or datetime.now(timezone.utc))).days,
                "review_count": q.repetitions,
                "user_avg_performance": 0.80
            })

    diff_metrics = difficulty_classifier.train(quiz_records)
    perf_metrics = performance_predictor.train(quiz_records)

    # Log ML train event in database
    log_entry = MLModelLog(
        model_name="DifficultyClassifier + PerformancePredictor",
        version="1.0.0",
        train_loss=diff_metrics.get("train_loss", 0.0),
        val_loss=diff_metrics.get("val_loss", 0.0),
        val_accuracy=diff_metrics.get("val_accuracy", 0.0)
    )
    db.add(log_entry)
    db.commit()

    return {
        "status": "completed",
        "difficulty_model": diff_metrics,
        "performance_predictor": perf_metrics
    }
