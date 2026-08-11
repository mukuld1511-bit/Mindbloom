import math
import numpy as np

try:
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import log_loss, accuracy_score
except ImportError:
    LogisticRegression = None
    train_test_split = None


class PerformancePredictor:
    def __init__(self):
        self.model = None

    def train(self, quiz_history: list[dict]) -> dict:
        """
        Trains LogisticRegression predictor on user study patterns.
        Features: [bias=1.0, difficulty, days_since_review, review_count, user_avg_performance]
        Target: 1 if recalled successfully (grade >= 0.6), 0 if failed.
        Holds out 20% validation split and reports training/validation metrics.
        """
        if not quiz_history or len(quiz_history) < 5 or LogisticRegression is None:
            return {
                "status": "default_projection",
                "message": "Model using standard Ebbinghaus forgetting curve.",
                "train_loss": 0.0,
                "val_loss": 0.0
            }

        X = []
        y = []

        for item in quiz_history:
            bias = 1.0
            diff = item.get("difficulty", 0.5)
            days = item.get("days_since_review", 1.0)
            rev_cnt = item.get("review_count", 1)
            user_avg = item.get("user_avg_performance", 0.75)
            grade = item.get("performance_grade", 0.8)

            feat = [bias, float(diff), float(days), float(rev_cnt), float(user_avg)]
            label = 1 if grade >= 0.6 else 0
            X.append(feat)
            y.append(label)

        X = np.array(X)
        y = np.array(y)

        if len(np.unique(y)) < 2:
            # Synthetic balancing sample
            X = np.vstack([X, [1.0, 0.2, 1.0, 5, 0.9], [1.0, 0.8, 20.0, 1, 0.3]])
            y = np.append(y, [1, 0])

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

        return {
            "status": "success",
            "train_loss": round(train_loss, 4),
            "val_loss": round(val_loss, 4),
            "val_accuracy": round(val_acc, 4)
        }

    def predict_learning_curve(self, user_avg_performance: float = 0.80, avg_difficulty: float = 0.45) -> list[dict]:
        """
        Projects 30-day retention curve for the user.
        Returns: list of {"day": int, "retention": float}
        """
        projections = []

        for day in range(1, 31):
            if self.model is not None and LogisticRegression is not None:
                try:
                    # Feature vector: [bias, avg_difficulty, day, review_count=2, user_avg_perf]
                    feat = np.array([[1.0, avg_difficulty, float(day), 2.0, user_avg_performance]])
                    prob = self.model.predict_proba(feat)[0][1]
                    retention = float(np.clip(prob, 0.05, 0.99))
                except Exception:
                    # Ebbinghaus forgetting curve formula: R = e^(-t / S)
                    S = 5.0 * user_avg_performance / (avg_difficulty + 0.1)
                    retention = math.exp(-day / S)
            else:
                # Standard modified Ebbinghaus curve: R = exp(-day / S)
                stability = max(1.0, 7.0 * user_avg_performance)
                retention = math.exp(-day / stability)

            projections.append({
                "day": day,
                "retention": round(float(np.clip(retention, 0.10, 0.98)), 3)
            })

        return projections
