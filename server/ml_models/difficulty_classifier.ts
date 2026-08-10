import { Database } from 'sql.js';
import { saveDb } from '../database';

export interface DifficultyFeatures {
  intercept: number;
  lengthNorm: number;
  wordCountNorm: number;
  entityFreqNorm: number;
  typeWeight: number;
}

export class DifficultyClassifier {
  private weights: number[] = [0.0, 0.5, 0.5, 0.3, 0.4]; // Initial weights vector [w0, w1, w2, w3, w4]

  constructor() {}

  private sigmoid(z: number): number {
    return 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, z))));
  }

  public extractFeatures(
    questionText: string,
    questionType: string,
    entityFrequency: number = 1
  ): DifficultyFeatures {
    const lengthNorm = Math.min(questionText.length / 150, 2.0);
    const words = questionText.trim().split(/\s+/).length;
    const wordCountNorm = Math.min(words / 30, 2.0);
    const entityFreqNorm = Math.min(entityFrequency / 10, 2.0);

    let typeWeight = 0.3;
    if (questionType === 'short_answer') typeWeight = 0.8;
    else if (questionType === 'fill_in_blank') typeWeight = 0.6;
    else if (questionType === 'multiple_choice') typeWeight = 0.4;
    else if (questionType === 'true_false') typeWeight = 0.2;

    return {
      intercept: 1.0,
      lengthNorm,
      wordCountNorm,
      entityFreqNorm,
      typeWeight
    };
  }

  public loadWeightsFromDb(db: Database): void {
    try {
      const stmt = db.prepare(`SELECT weights_json FROM ml_models WHERE model_name = 'difficulty_classifier'`);
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
      console.warn('Could not load difficulty classifier weights, using defaults:', err);
    }
  }

  public saveWeightsToDb(db: Database): void {
    try {
      const weightsJson = JSON.stringify(this.weights);
      const now = new Date().toISOString();
      db.run(
        `INSERT OR REPLACE INTO ml_models (model_name, weights_json, updated_at) VALUES ('difficulty_classifier', ?, ?)`,
        [weightsJson, now]
      );
      saveDb(db);
    } catch (err) {
      console.error('Error saving difficulty weights to DB:', err);
    }
  }

  public predictDifficulty(
    questionText: string,
    questionType: string,
    entityFrequency: number = 1
  ): { difficultyScore: number; difficultyLabel: 'easy' | 'medium' | 'hard'; confidenceScore: number } {
    const feat = this.extractFeatures(questionText, questionType, entityFrequency);
    const x = [feat.intercept, feat.lengthNorm, feat.wordCountNorm, feat.entityFreqNorm, feat.typeWeight];

    let dot = 0;
    for (let i = 0; i < x.length; i++) {
      dot += this.weights[i] * x[i];
    }

    const score = Number(this.sigmoid(dot).toFixed(2));

    let label: 'easy' | 'medium' | 'hard' = 'medium';
    if (score < 0.35) label = 'easy';
    else if (score > 0.65) label = 'hard';

    const confidenceScore = Number((0.75 + Math.abs(score - 0.5) * 0.4).toFixed(2));

    return {
      difficultyScore: score,
      difficultyLabel: label,
      confidenceScore
    };
  }

  /**
   * Train SGD classifier over real user quiz history dataset.
   */
  public trainClassifier(db: Database, epochs: number = 30, lr: number = 0.05): { epochsTrained: number; loss: number } {
    this.loadWeightsFromDb(db);

    // Fetch question features & actual historical failure rate as target difficulty
    const query = `
      SELECT q.question_text, q.question_type, h.performance_grade
      FROM quiz_history h
      JOIN questions q ON h.question_id = q.id
    `;

    const samples: { x: number[]; target: number }[] = [];
    try {
      const stmt = db.prepare(query);
      while (stmt.step()) {
        const row = stmt.getAsObject();
        const feat = this.extractFeatures(
          (row.question_text as string) || '',
          (row.question_type as string) || 'multiple_choice'
        );
        const x = [feat.intercept, feat.lengthNorm, feat.wordCountNorm, feat.entityFreqNorm, feat.typeWeight];
        
        // Target difficulty is inverse of performance grade (grade 1.0 -> target 0.0 easy; grade 0.0 -> target 1.0 hard)
        const perf = Number(row.performance_grade ?? 1.0);
        const targetDiff = Math.max(0, Math.min(1, 1.0 - perf));

        samples.push({ x, target: targetDiff });
      }
      stmt.free();
    } catch (err) {
      console.warn('Error querying training samples for difficulty classifier:', err);
    }

    if (samples.length === 0) {
      return { epochsTrained: 0, loss: 0 };
    }

    let finalLoss = 0;

    // Run Gradient Descent over epochs
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

        // SGD Gradient update
        for (let j = 0; j < this.weights.length; j++) {
          this.weights[j] -= lr * error * sample.x[j];
        }
      }

      finalLoss = totalLoss / samples.length;
    }

    this.saveWeightsToDb(db);
    return { epochsTrained: epochs, loss: Number(finalLoss.toFixed(4)) };
  }
}
