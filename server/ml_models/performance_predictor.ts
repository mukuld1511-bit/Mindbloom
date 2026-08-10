import { Database } from 'sql.js';
import { saveDb } from '../database';

export class PerformancePredictor {
  // Weights array: [b0 (bias), b1 (difficulty), b2 (days_since), b3 (review_count), b4 (user_avg_perf)]
  private weights: number[] = [1.2, -1.5, -0.08, 0.4, 1.8];

  constructor() {}

  private sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, z))));
  }

  public loadWeightsFromDb(db: Database): void {
    try {
      const stmt = db.prepare(`SELECT weights_json FROM ml_models WHERE model_name = 'performance_predictor'`);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        if (row.weights_json) {
          const parsed = JSON.parse(row.weights_json as string);
          if (Array.isArray(parsed) && parsed.length === 5) {
            this.weights = parsed;
          }
        }
      }
      stmt.free();
    } catch (err) {
      console.warn('Could not load performance predictor weights, using defaults:', err);
    }
  }

  public saveWeightsToDb(db: Database): void {
    try {
      const weightsJson = JSON.stringify(this.weights);
      const now = new Date().toISOString();
      db.run(
        `INSERT OR REPLACE INTO ml_models (model_name, weights_json, updated_at) VALUES ('performance_predictor', ?, ?)`,
        [weightsJson, now]
      );
      saveDb(db);
    } catch (err) {
      console.error('Error saving performance predictor weights:', err);
    }
  }

  /**
   * Fit linear/logistic regression weights on user's actual quiz review history
   */
  public trainModel(db: Database, epochs: number = 40, lr: number = 0.04): { epochsTrained: number; loss: number } {
    this.loadWeightsFromDb(db);

    const query = `
      SELECT h.performance_grade, h.review_interval, h.created_at, q.difficulty_score
      FROM quiz_history h
      JOIN questions q ON h.question_id = q.id
      ORDER BY h.created_at ASC
    `;

    const samples: { x: number[]; target: number }[] = [];
    let cumulativeGradeSum = 0;
    let totalCount = 0;

    try {
      const stmt = db.prepare(query);
      while (stmt.step()) {
        const row = stmt.getAsObject();
        const diff = Number(row.difficulty_score ?? 0.5);
        const days = Math.min(Number(row.review_interval ?? 1.0), 30.0);
        
        totalCount++;
        const targetPerf = Number(row.performance_grade ?? 1.0);
        cumulativeGradeSum += targetPerf;
        const userAvgPerf = cumulativeGradeSum / totalCount;
        const reviewCountNorm = Math.min(totalCount / 20.0, 2.0);

        // Feature vector [b0, difficulty, days_since, review_count_norm, user_avg_perf]
        const x = [1.0, diff, days, reviewCountNorm, userAvgPerf];
        samples.push({ x, target: targetPerf });
      }
      stmt.free();
    } catch (err) {
      console.warn('Error querying training samples for performance predictor:', err);
    }

    if (samples.length === 0) {
      return { epochsTrained: 0, loss: 0 };
    }

    let finalLoss = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalLoss = 0;

      for (const sample of samples) {
        let dot = 0;
        for (let j = 0; j < sample.x.length; j++) {
          dot += this.weights[j] * sample.x[j];
        }
        const pred = this.sigmoid(dot);
        const error = pred - sample.target;

        totalLoss += error * error;

        for (let j = 0; j < this.weights.length; j++) {
          this.weights[j] -= lr * error * sample.x[j];
        }
      }

      finalLoss = totalLoss / samples.length;
    }

    this.saveWeightsToDb(db);
    return { epochsTrained: epochs, loss: Number(finalLoss.toFixed(4)) };
  }

  public predictPerformance(
    db: Database,
    userId: string,
    questionDifficulty: number = 0.5,
    daysSinceLastReview: number = 1.0,
    reviewCount: number = 1
  ): number {
    this.loadWeightsFromDb(db);

    // Calculate user historical avg
    let userAvg = 0.8;
    try {
      const stmt = db.prepare(`SELECT AVG(performance_grade) as avg_grade FROM quiz_history WHERE user_id = ?`);
      stmt.bind([userId]);
      if (stmt.step()) {
        const res = stmt.getAsObject();
        if (res.avg_grade !== null && res.avg_grade !== undefined) {
          userAvg = Number(res.avg_grade);
        }
      }
      stmt.free();
    } catch (err) {
      // fallback
    }

    const reviewCountNorm = Math.min(reviewCount / 20.0, 2.0);
    const x = [1.0, questionDifficulty, daysSinceLastReview, reviewCountNorm, userAvg];

    let dot = 0;
    for (let i = 0; i < x.length; i++) {
      dot += this.weights[i] * x[i];
    }

    return Number(this.sigmoid(dot).toFixed(2));
  }

  /**
   * Projects future 30-day Ebbinghaus forgetting curve based on trained model weights
   */
  public predictLearningCurve(
    db: Database,
    userId: string
  ): { day: number; predictedRetention: number }[] {
    this.loadWeightsFromDb(db);

    const curve: { day: number; predictedRetention: number }[] = [];
    const daysToProject = [0, 1, 2, 3, 5, 7, 10, 14, 21, 30];

    for (const day of daysToProject) {
      const retentionProb = this.predictPerformance(db, userId, 0.4, day, 3);
      curve.push({
        day,
        predictedRetention: Math.round(retentionProb * 100)
      });
    }

    return curve;
  }
}
