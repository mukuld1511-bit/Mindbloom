export interface SM2Input {
  grade: number; // 0.0 to 1.0 (or mapped from 0 to 5)
  repetitions: number;
  interval: number; // in days
  easinessFactor: number; // EF, default 2.5
}

export interface SM2Output {
  repetitions: number;
  interval: number;
  easinessFactor: number;
  nextReviewDate: string;
}

export class SpacedRepetitionScheduler {
  /**
   * SuperMemo SM-2 Spaced Repetition Calculator
   */
  public calculateSM2(input: SM2Input): SM2Output {
    // Convert 0.0 - 1.0 grade scale to 0 - 5 scale for classic SM-2 formula
    const q = Math.round(Math.max(0, Math.min(1, input.grade)) * 5);

    let repetitions = input.repetitions;
    let interval = input.interval;
    let ef = input.easinessFactor || 2.5;

    if (q >= 3) {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * ef);
      }
      repetitions += 1;
    } else {
      repetitions = 0;
      interval = 1;
    }

    // Update Easiness Factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (ef < 1.3) ef = 1.3;

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);

    return {
      repetitions,
      interval,
      easinessFactor: Number(ef.toFixed(2)),
      nextReviewDate: nextDate.toISOString()
    };
  }
}
