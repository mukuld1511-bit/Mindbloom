import os
import joblib
import numpy as np

try:
    from sklearn.linear_model import LogisticRegression, SGDClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import log_loss, accuracy_score
except ImportError:
    LogisticRegression = None
    SGDClassifier = None
    train_test_split = None


MODEL_PATH = os.path.join(os.path.dirname(__file__), "saved_difficulty_model.joblib")

QUESTION_TYPE_WEIGHTS = {
    "multiple_choice": 0.3,
    "true_false": 0.2,
    "fill_in_blank": 0.5,
    "short_answer": 0.8
}


class DifficultyClassifier:
    def __init__(self):
        self.model = None
        self.load_model()

    def _extract_features(self, question_data: dict) -> list[float]:
        """
        Feature vector: [question_length, word_count, entity_frequency, qtype_weight]
        """
        prompt = question_data.get("prompt", "")
        qtype = question_data.get("question_type", "multiple_choice")
        ent_freq = question_data.get("entity_frequency", 1)

        q_len = len(prompt)
        w_count = len(prompt.split())
        qtype_weight = QUESTION_TYPE_WEIGHTS.get(qtype, 0.4)

        return [float(q_len), float(w_count), float(ent_freq), float(qtype_weight)]

    def predict_difficulty(self, question_data: dict) -> float:
        """
        Predicts question difficulty score between 0.1 and 0.9.
        """
        features = self._extract_features(question_data)

        if self.model is not None and LogisticRegression is not None:
            try:
                X = np.array([features])
                # Prob of being difficult (class 1)
                if hasattr(self.model, "predict_proba"):
                    probs = self.model.predict_proba(X)
                    pred = probs[0][1] if len(probs[0]) > 1 else probs[0][0]
                    return float(np.clip(pred, 0.1, 0.9))
            except Exception:
                pass

        # Heuristic fallback if model not trained yet
        q_len, w_count, ent_freq, qtype_weight = features
        raw_score = (qtype_weight * 0.5) + (w_count / 100.0 * 0.3) + (1.0 / (ent_freq + 1) * 0.2)
        return float(np.clip(raw_score, 0.1, 0.9))

    def train(self, quiz_records: list[dict]) -> dict:
        """
        Trains model on quiz history joined to question features.
        Target = 1 - performance_grade (where grade is 0.0 to 1.0, 1 = easy/correct, 0 = hard/fail).
        Holds out 20% as validation split and reports training & validation loss.
        """
        if not quiz_records or len(quiz_records) < 5 or LogisticRegression is None:
            return {
                "status": "insufficient_data",
                "message": "Need at least 5 quiz records to train model.",
                "train_loss": 0.0,
                "val_loss": 0.0,
                "val_accuracy": 0.0
            }

        X = []
        y = []

        for record in quiz_records:
            feats = self._extract_features(record)
            grade = record.get("performance_grade", 0.5)
            # Binary target: 1 if user struggled (grade < 0.6), 0 if user succeeded
            target = 1 if grade < 0.6 else 0
            X.append(feats)
            y.append(target)

        X = np.array(X)
        y = np.array(y)

        # Ensure both classes exist in dataset for binary log loss
        if len(np.unique(y)) < 2:
            # Synthetic balancing sample
            X = np.vstack([X, [20, 4, 5, 0.2], [150, 30, 1, 0.8]])
            y = np.append(y, [0, 1])

        # Hold out 20% validation split
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.20, random_state=42)

        model = LogisticRegression(max_iter=500)
        model.fit(X_train, y_train)

        train_probs = model.predict_proba(X_train)
        val_probs = model.predict_proba(X_val)
        val_preds = model.predict(X_val)

        train_loss = float(log_loss(y_train, train_probs, labels=[0, 1]))
        val_loss = float(log_loss(y_val, val_probs, labels=[0, 1]))
        val_acc = float(accuracy_score(y_val, val_preds))

        self.model = model
        self.save_model()

        return {
            "status": "success",
            "samples_trained": len(X_train),
            "samples_validated": len(X_val),
            "train_loss": round(train_loss, 4),
            "val_loss": round(val_loss, 4),
            "val_accuracy": round(val_acc, 4)
        }

    def save_model(self):
        if self.model is not None:
            try:
                joblib.dump(self.model, MODEL_PATH)
            except Exception:
                pass

    def load_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                self.model = joblib.load(MODEL_PATH)
            except Exception:
                self.model = None
