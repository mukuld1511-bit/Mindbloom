import { Question } from '../../types.js';

export interface DifficultyPrediction {
  difficultyScore: number; // 0 (easiest) to 1 (hardest)
  difficultyLabel: 'easy' | 'medium' | 'hard';
  confidenceScore: number;
  featureWeights: {
    lengthFactor: number;
    vocabularyComplexity: number;
    questionTypeWeight: number;
    entityFrequencyPenalty: number;
  };
}

export class DifficultyClassifier {
  // Model weights trained via logistic regression simulation
  private weights = {
    intercept: -0.8,
    lengthWeight: 0.005,
    vocabWeight: 0.45,
    typeWeights: {
      multiple_choice: 0.2,
      true_false: 0.1,
      fill_in_blank: 0.5,
      short_answer: 0.85
    },
    entityFrequencyWeight: -0.05
  };

  private rareVocabSet = new Set([
    'stochastic', 'heuristic', 'eigenvalue', 'backpropagation', 'gradient',
    'entropy', 'covariance', 'hyperplane', 'polynomial', 'asymptotic',
    'deterministic', 'convolutional', 'recurrent', 'transformer', 'bayesian',
    'markovian', 'isomorphism', 'dichotomy', 'paradigm', 'ontology'
  ]);

  public predict_difficulty(questionText: string, type: string = 'multiple_choice', entityFrequency: number = 1): DifficultyPrediction {
    // 1. Feature Extraction
    const length = questionText.length;
    const words = questionText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
    
    let rareCount = 0;
    words.forEach((w) => {
      if (this.rareVocabSet.has(w) || w.length > 10) rareCount++;
    });
    const vocabComplexity = words.length > 0 ? rareCount / words.length : 0;

    const typeWeight = this.weights.typeWeights[type as keyof typeof this.weights.typeWeights] || 0.4;
    const lengthFactor = Math.min(100, length) * this.weights.lengthWeight;
    const entityFreqPenalty = Math.min(10, entityFrequency) * this.weights.entityFrequencyWeight;

    // 2. Logistic Regression Logit Calculation z = w^T * x + b
    const z =
      this.weights.intercept +
      lengthFactor +
      vocabComplexity * this.weights.vocabWeight +
      typeWeight +
      entityFreqPenalty;

    // 3. Sigmoid activation function: 1 / (1 + exp(-z))
    const difficultyScore = parseFloat((1 / (1 + Math.exp(-z))).toFixed(3));

    let difficultyLabel: 'easy' | 'medium' | 'hard' = 'medium';
    if (difficultyScore < 0.4) difficultyLabel = 'easy';
    else if (difficultyScore > 0.68) difficultyLabel = 'hard';

    // Confidence score based on distance from decision boundary (0.5)
    const confidenceScore = parseFloat((0.6 + Math.abs(difficultyScore - 0.5) * 0.7).toFixed(2));

    return {
      difficultyScore,
      difficultyLabel,
      confidenceScore,
      featureWeights: {
        lengthFactor: parseFloat(lengthFactor.toFixed(3)),
        vocabularyComplexity: parseFloat(vocabComplexity.toFixed(3)),
        questionTypeWeight: typeWeight,
        entityFrequencyPenalty: parseFloat(entityFreqPenalty.toFixed(3))
      }
    };
  }

  public train_classifier(trainingData: { questionText: string; type: string; actualDifficulty: number }[]): { success: boolean; trainedCount: number } {
    if (trainingData.length === 0) return { success: false, trainedCount: 0 };

    // Gradient descent iteration to fit weight params
    const lr = 0.01;
    trainingData.forEach(({ questionText, type, actualDifficulty }) => {
      const pred = this.predict_difficulty(questionText, type);
      const error = pred.difficultyScore - actualDifficulty;

      this.weights.intercept -= lr * error;
      this.weights.vocabWeight -= lr * error * pred.featureWeights.vocabularyComplexity;
    });

    return { success: true, trainedCount: trainingData.length };
  }
}
