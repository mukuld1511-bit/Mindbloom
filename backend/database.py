import os
from datetime import datetime, timezone
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

DATABASE_PATH = os.path.join(os.path.dirname(__file__), "mindbloom.db")
DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, default="default_user")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Source(Base):
    __tablename__ = "sources"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    source_url = Column(String, nullable=True)
    human_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    entities = relationship("Entity", back_populates="source", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="source", cascade="all, delete-orphan")


class Entity(Base):
    __tablename__ = "entities"
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("sources.id"))
    name = Column(String, index=True)
    type = Column(String)  # TOPIC, PRINCIPLE, METHOD, RESULT, CONCEPT, PERSON, ORG, LOCATION
    context = Column(Text)
    importance = Column(Float, default=1.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    source = relationship("Source", back_populates="entities")


class Relationship(Base):
    __tablename__ = "relationships"
    id = Column(Integer, primary_key=True, index=True)
    source_entity = Column(String, index=True)
    target_entity = Column(String, index=True)
    relation_type = Column(String)  # is_a, causes, part_of, relates_to
    confidence = Column(Float, default=0.8)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Fact(Base):
    __tablename__ = "facts"
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, index=True)
    predicate = Column(String)
    object_term = Column(String)
    statement = Column(Text)
    confidence = Column(Float, default=0.85)


class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=True)
    question_type = Column(String)  # multiple_choice, fill_in_blank, true_false, short_answer
    prompt = Column(Text)
    correct_answer = Column(Text)
    choices = Column(Text)  # Pipe-separated choices "A|B|C|D"
    target_entity = Column(String)
    explanation = Column(Text)
    difficulty = Column(Float, default=0.5)
    
    # SM-2 Spaced Repetition Fields
    repetitions = Column(Integer, default=0)
    easiness_factor = Column(Float, default=2.5)
    interval_days = Column(Integer, default=0)
    next_review_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    last_reviewed_at = Column(DateTime, nullable=True)

    source = relationship("Source", back_populates="questions")


class QuizHistory(Base):
    __tablename__ = "quiz_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, default=1)
    question_id = Column(Integer, ForeignKey("questions.id"))
    user_answer = Column(Text)
    performance_grade = Column(Float)  # 0.0 to 1.0
    quality_score = Column(Integer)  # 0 to 5 SM-2
    time_taken_seconds = Column(Float, default=5.0)
    reviewed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class MLModelLog(Base):
    __tablename__ = "ml_models"
    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String)
    version = Column(String)
    train_loss = Column(Float)
    val_loss = Column(Float)
    val_accuracy = Column(Float)
    trained_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


def init_db():
    Base.metadata.create_all(bind=engine)
    seed_initial_data()


def seed_initial_data():
    session = SessionLocal()
    try:
        if session.query(Source).count() > 0:
            return

        # Seed initial source document
        s1 = Source(
            title="Spaced Repetition & Cognitive Knowledge Graphs",
            content="""Spaced repetition is an evidence-based learning technique that incorporates increasing intervals of time between subsequent review of previously learned material. The SM-2 algorithm, developed by Piotr Wozniak, calculates the optimal review interval based on an easiness factor. Knowledge graphs organize information into nodes (entities) and edges (relationships). Combining natural language processing with spaced repetition enables automated question generation and learning curve prediction.""",
            source_url="https://en.wikipedia.org/wiki/Spaced_repetition"
        )
        session.add(s1)
        session.commit()

        # Seed initial entities
        e1 = Entity(source_id=s1.id, name="Spaced Repetition", type="METHOD", context="Spaced repetition is an evidence-based learning technique.", importance=1.5)
        e2 = Entity(source_id=s1.id, name="SM-2 Algorithm", type="PRINCIPLE", context="The SM-2 algorithm calculates optimal review interval based on easiness factor.", importance=1.4)
        e3 = Entity(source_id=s1.id, name="Knowledge Graph", type="TOPIC", context="Knowledge graphs organize information into nodes and edges.", importance=1.3)
        e4 = Entity(source_id=s1.id, name="Active Recall", type="CONCEPT", context="Active recall strengthens synaptic connections during memory retrieval.", importance=1.2)

        session.add_all([e1, e2, e3, e4])

        # Seed relationships
        r1 = Relationship(source_entity="SM-2 Algorithm", target_entity="Spaced Repetition", relation_type="is_a", confidence=0.95)
        r2 = Relationship(source_entity="Spaced Repetition", target_entity="Active Recall", relation_type="causes", confidence=0.88)
        r3 = Relationship(source_entity="Knowledge Graph", target_entity="Spaced Repetition", relation_type="relates_to", confidence=0.82)
        session.add_all([r1, r2, r3])

        # Seed sample questions
        q1 = Question(
            source_id=s1.id,
            question_type="multiple_choice",
            prompt="Which algorithm calculates review intervals based on an easiness factor?",
            correct_answer="SM-2 Algorithm",
            choices="SM-2 Algorithm|PageRank|TextRank|TF-IDF",
            target_entity="SM-2 Algorithm",
            explanation="The SM-2 algorithm, developed by Piotr Wozniak, uses easiness factors to adjust intervals.",
            difficulty=0.35,
            next_review_date=datetime.now(timezone.utc)
        )
        q2 = Question(
            source_id=s1.id,
            question_type="true_false",
            prompt="True or False: The SM-2 Algorithm is a component of Spaced Repetition.",
            correct_answer="True",
            choices="True|False",
            target_entity="Spaced Repetition",
            explanation="Correct. SM-2 is the fundamental algorithm driving spaced repetition systems.",
            difficulty=0.25,
            next_review_date=datetime.now(timezone.utc)
        )
        q3 = Question(
            source_id=s1.id,
            question_type="fill_in_blank",
            prompt="Fill in the blank: __________ organize information into nodes (entities) and edges (relationships).",
            correct_answer="Knowledge Graphs",
            choices="Knowledge Graphs",
            target_entity="Knowledge Graph",
            explanation="Knowledge graphs structure concept connections.",
            difficulty=0.40,
            next_review_date=datetime.now(timezone.utc)
        )

        session.add_all([q1, q2, q3])
        session.commit()
    finally:
        session.close()
