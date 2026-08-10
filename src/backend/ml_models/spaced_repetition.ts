import { QuizHistoryRecord } from '../../types.js';

export interface SM2Result {
  nextReviewDate: string; // ISO date string
  newInterval: number; // in days
  newEasinessFactor: number;
  grade: number; // 0 to 5
  message: string;
}

export class SpacedRepetitionEngine {
  /**
   * SM-2 Algorithm (SuperMemo-2)
   * Converts performance (0 = forgot, 0.5 = partial, 1 = perfect) to SM-2 grade (0 to 5):
   * 0 -> Grade 0 (Blackout)
   * 0.5 -> Grade 3 (Correct with difficulty)
   * 1.0 -> Grade 5 (Perfect response)
   */
  public calculate_next_review(
    userPerformance: number, // 0, 0.5, or 1
    previousEasinessFactor: number = 2.5,
    previousInterval: number = 0,
    reviewCount: number = 0
  ): SM2Result {
    // Map performance to 0-5 SM-2 grade scale
    let grade = 0;
    if (userPerformance >= 1.0) grade = 5;
    else if (userPerformance >= 0.7) grade = 4;
    else if (userPerformance >= 0.4) grade = 3;
    else if (userPerformance >= 0.2) grade = 2;
    else grade = 0;

    // SM-2 Easiness Factor formula:
    // EF' = max(1.3, EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)))
    let newEF =
      previousEasinessFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    if (newEF < 1.3) newEF = 1.3;

    let newInterval = 1;

    if (grade < 3) {
      // Repetition failed: restart learning interval
      newInterval = 1;
    } else {
      // Successful recall
      if (reviewCount === 0 || previousInterval === 0) {
        newInterval = 1;
      } else if (reviewCount === 1 || previousInterval === 1) {
        newInterval = 6;
      } else {
        newInterval = Math.round(previousInterval * newEF);
      }
    }

    // Calculate next review timestamp
    const now = new Date();
    const nextDate = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

    let message = '';
    if (grade >= 4) message = `Mastery reinforced! Next review in ${newInterval} days.`;
    else if (grade >= 3) message = `Good recall. Review scheduled in ${newInterval} days.`;
    else message = `Needs review. Scheduled for tomorrow.`;

    return {
      nextReviewDate: nextDate.toISOString(),
      newInterval,
      newEasinessFactor: parseFloat(newEF.toFixed(2)),
      grade,
      message
    };
  }

  public get_questions_to_review<T extends { id: string; nextReviewDate?: string }>(
    questions: T[]
  ): T[] {
    const now = new Date();
    return questions
      .filter((q) => {
        if (!q.nextReviewDate) return true; // new question, due immediately
        return new Date(q.nextReviewDate) <= now;
      })
      .sort((a, b) => {
        const dateA = a.nextReviewDate ? new Date(a.nextReviewDate).getTime() : 0;
        const dateB = b.nextReviewDate ? new Date(b.nextReviewDate).getTime() : 0;
        return dateA - dateB; // older due dates first
      });
  }
}
