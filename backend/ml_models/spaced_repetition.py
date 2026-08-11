import math
from datetime import datetime, timedelta, timezone


class SpacedRepetitionEngine:
    """
    Exact SuperMemo SM-2 Algorithm Implementation.
    """

    @staticmethod
    def grade_to_quality(performance_grade: float) -> int:
        """
        Converts performance_grade (0.0 to 1.0) into SM-2 quality score q (0 to 5):
        1.0 -> 5 (perfect response)
        0.8 -> 4 (correct response after hesitation)
        0.6 -> 3 (correct response with serious difficulty)
        0.4 -> 2 (incorrect response; where correct one seemed easy to recall)
        0.2 -> 1 (incorrect response; correct one remembered)
        0.0 -> 0 (complete blackout)
        """
        if performance_grade >= 0.95:
            return 5
        elif performance_grade >= 0.75:
            return 4
        elif performance_grade >= 0.55:
            return 3
        elif performance_grade >= 0.35:
            return 2
        elif performance_grade >= 0.15:
            return 1
        else:
            return 0

    @staticmethod
    def calculate_sm2(
        quality: int,
        repetitions: int,
        easiness_factor: float,
        interval: int
    ) -> tuple[int, float, int]:
        """
        Computes next (repetitions, easiness_factor, interval_days) according to SM-2 formula.
        """
        # 1. Update Easiness Factor (EF)
        # EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        q = quality
        new_ef = easiness_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        # EF floor of 1.3
        if new_ef < 1.3:
            new_ef = 1.3

        # 2. Update Repetitions & Interval
        if q >= 3:
            # Correct response
            if repetitions == 0:
                new_interval = 1
            elif repetitions == 1:
                new_interval = 6
            else:
                new_interval = int(math.ceil(interval * new_ef))
            new_reps = repetitions + 1
        else:
            # Incorrect response: reset repetition count, repeat tomorrow
            new_reps = 0
            new_interval = 1

        return new_reps, round(new_ef, 3), new_interval

    def process_review(
        self,
        performance_grade: float,
        current_reps: int = 0,
        current_ef: float = 2.5,
        current_interval: int = 0
    ) -> dict:
        """
        Calculates SM-2 values and returns next review date.
        """
        q = self.grade_to_quality(performance_grade)
        next_reps, next_ef, next_interval = self.calculate_sm2(
            quality=q,
            repetitions=current_reps,
            easiness_factor=current_ef,
            interval=current_interval
        )

        now = datetime.now(timezone.utc)
        next_review_datetime = now + timedelta(days=next_interval)

        return {
            "quality": q,
            "repetitions": next_reps,
            "easiness_factor": next_ef,
            "interval_days": next_interval,
            "next_review_date": next_review_datetime.isoformat(),
            "last_reviewed_at": now.isoformat()
        }
