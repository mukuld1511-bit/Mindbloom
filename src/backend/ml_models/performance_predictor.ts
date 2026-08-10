import { QuizHistoryRecord, PerformancePrediction } from '../../types.js';

export class PerformancePredictor {
  // Regression weights for predicting probability of correct recall
  // P(Recall) = 1 / (1 + exp(-(b0 + b1*userAvg + b2*reviewCount - b3*difficulty - b4*daysElapsed)))
  private b0 = 1.2; // Base intercept
  private b1 = 2.0; // User past average weight
  private b2 = 0.35; // Review count weight (reinforcement)
  private b3 = 1.8; // Question difficulty weight
  private b4 = 0.08; // Memory decay over days elapsed (Ebbinghaus forgetting curve)

  public predict_performance(
    questionDifficulty: number,
    daysSinceLastReview: number,
    reviewCount: number,
    userAvgPerformance: number
  ): { predictedAccuracy: number; confidenceInterval: [number, number]; retentionFactor: number } {
    // Ebbinghaus decay model combined with logistic recall probability
    const logit =
      this.b0 +
      this.b1 * (userAvgPerformance || 0.75) +
      this.b2 * Math.min(10, reviewCount) -
      this.b3 * questionDifficulty -
      this.b4 * daysSinceLastReview;

    const predictedAccuracy = parseFloat((1 / (1 + Math.exp(-logit))).toFixed(3));

    // Confidence interval (+/- 8% to 15% depending on sample size/reviewCount)
    const margin = parseFloat(Math.max(0.05, 0.18 - reviewCount * 0.02).toFixed(3));
    const ciLow = parseFloat(Math.max(0, predictedAccuracy - margin).toFixed(3));
    const ciHigh = parseFloat(Math.min(1.0, predictedAccuracy + margin).toFixed(3));

    return {
      predictedAccuracy,
      confidenceInterval: [ciLow, ciHigh],
      retentionFactor: parseFloat(Math.exp(-this.b4 * daysSinceLastReview).toFixed(3))
    };
  }

  public predict_learning_curve(
    userAvgPerformance: number = 0.8,
    historyCount: number = 5
  ): PerformancePrediction {
    const learningCurve: { day: number; predictedRetention: number }[] = [];

    // Project memory retention over next 30 days
    for (let day = 0; day <= 30; day += 3) {
      const pred = this.predict_performance(0.5, day, historyCount, userAvgPerformance);
      learningCurve.push({
        day,
        predictedRetention: Math.round(pred.predictedAccuracy * 100)
      });
    }

    const currentPred = this.predict_performance(0.5, 1, historyCount, userAvgPerformance);

    let recommendation = 'Keep up the daily reviews to flatten your forgetting curve!';
    if (currentPred.predictedAccuracy < 0.6) {
      recommendation = 'Focus on reviewing hard items and high-difficulty concepts today.';
    } else if (currentPred.predictedAccuracy > 0.88) {
      recommendation = 'Excellent memory retention! You are ready to ingest new content.';
    }

    return {
      predictedAccuracy: currentPred.predictedAccuracy,
      confidenceInterval: currentPred.confidenceInterval,
      learningCurve,
      recommendation
    };
  }
}
