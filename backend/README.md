# MindBloom Backend — Python / FastAPI ML Engine

Centralized local Machine Learning and Natural Language Processing backend for MindBloom. Built with **spaCy**, **scikit-learn**, **NetworkX**, **FastAPI**, and **SQLAlchemy**.

## Key Features & Architecture

1. **Entity Extraction (`entity_extraction.py`)**:
   - Uses spaCy (`en_core_web_sm`) named entity recognition.
   - Maps standard labels (`PERSON`, `ORG`, `LOCATION`, `DATE`, `PRODUCT`) plus custom domain types (`TOPIC`, `PRINCIPLE`, `METHOD`, `RESULT`, `CONCEPT`).
   - Ranks entities by importance = frequency × specificity score.

2. **Keyword Extraction (`keyword_extraction.py`)**:
   - Computes real TF-IDF across document paragraphs as pseudo-documents.
   - TextRank graph via NetworkX (`nx.pagerank` with damping factor 0.85 and co-occurrence window of 4).
   - Combines scores 50/50 to extract top-N key terms.

3. **Relationship Extraction (`relationship_extraction.py`)**:
   - spaCy dependency-parsing for subject-verb-object copulas (`is_a`, `causes`, `part_of`, `relates_to`).
   - Fallback same-sentence entity co-occurrence detection with 0.75 confidence score.

4. **Question Generation (`question_generator.py`)**:
   - Generates 4 question formats: `multiple_choice`, `fill_in_blank`, `true_false`, `short_answer`.
   - Distractors for multiple choice prefer entities of the **same entity type**.
   - True/false generates genuine negative examples ~50% of the time.

5. **Difficulty Classifier (`difficulty_classifier.py`)**:
   - Scikit-learn Logistic Regression trained on question length, word count, entity frequency, and question-type weights.
   - Evaluates on a 20% holdout validation split and persists model via `joblib`.

6. **Spaced Repetition (`spaced_repetition.py`)**:
   - Exact SuperMemo **SM-2 algorithm** implementation for calculating intervals, easiness factor updates (floor 1.3), and due dates.

7. **Performance Predictor (`performance_predictor.py`)**:
   - Scikit-learn Logistic Regression projecting 30-day retention curves based on review history and question difficulty.

8. **Knowledge Graph Engine (`knowledge_graph.py`)**:
   - NetworkX directed graph exporting `{nodes, edges}` JSON matching exact frontend requirements.

9. **FastAPI Server (`app.py`)**:
   - Full REST API with CORS enabled for both web client and Manifest V3 Chrome Extension.

## Setup & Running Locally

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Download spaCy English model
python -m spacy download en_core_web_sm

# 3. Launch FastAPI server
uvicorn backend.app:app --host 0.0.0.0 --port 8000 --reload
```

## API Contract

- `GET /api/health` — Service status
- `GET /api/stats` — Graph density and review metrics
- `GET /api/knowledge-graph` — Knowledge graph nodes and edges
- `GET /api/entities` — List extracted entities
- `GET /api/sources` — List ingested sources
- `POST /api/sources` — Ingest article text (`{ "title", "content", "sourceUrl" }`)
- `GET /api/quiz/due` — Retrieve questions due today
- `POST /api/quiz/submit` — Submit quiz score (`{ "question_id", "performance_grade" }`)
- `GET /api/predictions/learning-curve` — 30-day retention projection
- `POST /api/ml/train` — Trigger model retraining and view validation loss
