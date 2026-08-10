import React, { useState, useEffect } from 'react';

interface QuizInterfaceProps {
  onQuizCompleted?: () => void;
}

export const QuizInterface: React.FC<QuizInterfaceProps> = ({ onQuizCompleted }) => {
  const [currentQuestion, setCurrentQuestion] = useState<any | null>(null);
  const [dueCount, setDueCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [shortAnswer, setShortAnswer] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchNextQuestion = async () => {
    setIsLoading(true);
    setIsSubmitted(false);
    setSelectedOption('');
    setShortAnswer('');
    setResult(null);

    try {
      const res = await fetch('/api/quiz/next');
      const data = await res.json();
      setCurrentQuestion(data.question);
      setDueCount(data.dueCount);
      setTotalCount(data.totalCount);
    } catch (err) {
      console.error('Failed to fetch next question:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNextQuestion();
  }, []);

  const handleSubmitAnswer = async (gradeOverride?: number) => {
    if (!currentQuestion) return;

    let userAnswer = selectedOption;
    if (currentQuestion.type === 'short_answer' || currentQuestion.type === 'fill_in_blank') {
      userAnswer = shortAnswer;
    }

    let performance = 1.0;
    if (gradeOverride !== undefined) {
      performance = gradeOverride;
    } else {
      if (currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false') {
        performance = userAnswer.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase() ? 1.0 : 0.0;
      } else {
        performance = userAnswer.trim().toLowerCase().includes(currentQuestion.correctAnswer.trim().toLowerCase()) ? 1.0 : 0.5;
      }
    }

    try {
      const res = await fetch('/api/quiz/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: currentQuestion.id,
          user_answer: userAnswer,
          performance
        })
      });

      const data = await res.json();
      setResult(data);
      setIsSubmitted(true);
      if (onQuizCompleted) onQuizCompleted();
    } catch (err) {
      console.error('Failed to submit answer:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E4E1D8] p-12 text-center text-[#6B6A63] font-mono text-xs max-w-2xl mx-auto">
        <span>Loading intelligent SM-2 review queue...</span>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="bg-white border border-[#E4E1D8] border-l-2 border-l-[#3D5A45] p-8 text-center text-[#1C1B19] max-w-2xl mx-auto space-y-4">
        <span className="text-xs font-mono text-[#3D5A45] uppercase tracking-wider block">
          Review Queue Clear
        </span>
        <h3 className="font-serif text-2xl font-semibold">All Caught Up!</h3>
        <p className="text-xs text-[#6B6A63] max-w-md mx-auto leading-relaxed">
          No items due for review right now. Ingest additional source notes or return tomorrow as SM-2 intervals advance.
        </p>
        <button
          onClick={fetchNextQuestion}
          className="px-5 py-2 bg-[#3D5A45] hover:bg-[#2D4333] text-white rounded text-xs font-medium transition-colors"
        >
          Check Queue Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Session Header */}
      <div className="bg-white border border-[#E4E1D8] border-l-2 border-l-[#3D5A45] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div>
          <span className="font-serif font-semibold text-[#1C1B19] text-sm">
            SM-2 Spaced Review
          </span>
          <span className="text-[#6B6A63] font-mono text-[11px] block">
            Target Entity: <strong className="text-[#1C1B19]">{currentQuestion.entityName || 'Concept'}</strong>
          </span>
        </div>

        <div className="font-mono text-[11px] text-[#6B6A63] bg-[#FAFAF8] px-2.5 py-1 border border-[#E4E1D8] rounded">
          Due Queue: <strong className="text-[#3D5A45]">{dueCount}</strong> / {totalCount}
        </div>
      </div>

      {/* Main Question Notecard */}
      <div className="bg-white border border-[#E4E1D8] p-6 space-y-5">
        {/* Type & Difficulty */}
        <div className="flex items-center justify-between text-xs">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#3D5A45]/10 text-[#3D5A45] border border-[#3D5A45]/20 uppercase">
            {currentQuestion.type.replace('_', ' ')}
          </span>
          <span className="text-[11px] font-mono text-[#6B6A63]">
            Difficulty: <strong className="text-[#1C1B19] uppercase">{currentQuestion.difficultyLabel}</strong> ({currentQuestion.difficultyScore})
          </span>
        </div>

        {/* Question Text */}
        <h2 className="font-serif text-xl font-semibold text-[#1C1B19] leading-snug">
          {currentQuestion.questionText}
        </h2>

        {/* Options / Answer Input */}
        {!isSubmitted ? (
          <div className="space-y-4 pt-2">
            {currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false' ? (
              <div className="space-y-2">
                {currentQuestion.options?.map((opt: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedOption(opt)}
                    className={`w-full text-left p-3 rounded border text-xs font-medium transition-colors flex items-center justify-between ${
                      selectedOption === opt
                        ? 'bg-[#3D5A45]/10 border-[#3D5A45] text-[#3D5A45] font-semibold'
                        : 'bg-[#FAFAF8] border-[#E4E1D8] text-[#1C1B19] hover:bg-[#F4F3EE]'
                    }`}
                  >
                    <span>{opt}</span>
                    {selectedOption === opt && <span className="font-mono text-[10px] text-[#3D5A45]">[Selected]</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <textarea
                  rows={3}
                  placeholder="Type your answer phrase or recall notes here..."
                  value={shortAnswer}
                  onChange={(e) => setShortAnswer(e.target.value)}
                  className="w-full bg-[#FAFAF8] border border-[#E4E1D8] rounded p-3 text-[#1C1B19] text-xs placeholder-[#6B6A63] focus:outline-none focus:border-[#3D5A45] resize-none"
                />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => handleSubmitAnswer()}
                disabled={!selectedOption && !shortAnswer}
                className="px-5 py-2.5 bg-[#3D5A45] hover:bg-[#2D4333] text-white font-medium rounded transition-colors disabled:opacity-40 text-xs"
              >
                Submit Answer →
              </button>
            </div>
          </div>
        ) : (
          /* Answer Feedback & SM-2 Metrics */
          <div className="space-y-4 pt-3 border-t border-[#E4E1D8]">
            <div
              className={`p-4 rounded border text-xs space-y-1 font-sans ${
                result?.isCorrect
                  ? 'bg-[#3D5A45]/10 border-[#3D5A45]/30 text-[#3D5A45]'
                  : 'bg-[#A23B3B]/10 border-[#A23B3B]/30 text-[#A23B3B]'
              }`}
            >
              <h4 className="font-semibold text-sm">
                {result?.isCorrect ? 'Correct Recall!' : 'Incorrect / Partial Recall'}
              </h4>
              <p>
                <strong>Expected Answer:</strong> {result?.correctAnswer}
              </p>
              {result?.explanation && (
                <p className="text-[11px] opacity-90 pt-0.5">
                  {result.explanation}
                </p>
              )}
            </div>

            {/* SM-2 Metrics */}
            {result?.sm2 && (
              <div className="bg-[#FAFAF8] border border-[#E4E1D8] rounded p-3 space-y-2">
                <span className="text-[10px] font-mono text-[#6B6A63] uppercase block">
                  SM-2 Memory Schedule Calculation
                </span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="bg-white p-2 rounded border border-[#E4E1D8]">
                    <span className="text-[10px] text-[#6B6A63] block">Easiness</span>
                    <span className="font-semibold text-[#1C1B19]">{result.sm2.newEasinessFactor}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-[#E4E1D8]">
                    <span className="text-[10px] text-[#6B6A63] block">Interval</span>
                    <span className="font-semibold text-[#3D5A45]">{result.sm2.newInterval} days</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-[#E4E1D8]">
                    <span className="text-[10px] text-[#6B6A63] block">Grade</span>
                    <span className="font-semibold text-[#1C1B19]">{result.sm2.grade} / 5</span>
                  </div>
                </div>
              </div>
            )}

            {/* Self-evaluation override buttons */}
            {currentQuestion.type === 'short_answer' && (
              <div className="pt-2 space-y-1">
                <span className="text-[11px] font-mono text-[#6B6A63] block">
                  Adjust recall grade to fine-tune SM-2 scheduling:
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    onClick={() => handleSubmitAnswer(0.0)}
                    className="py-1.5 bg-[#A23B3B]/10 hover:bg-[#A23B3B]/20 text-[#A23B3B] border border-[#A23B3B]/30 rounded font-mono"
                  >
                    0 - Forgot
                  </button>
                  <button
                    onClick={() => handleSubmitAnswer(0.5)}
                    className="py-1.5 bg-[#FAFAF8] hover:bg-[#F4F3EE] text-[#1C1B19] border border-[#E4E1D8] rounded font-mono"
                  >
                    0.5 - Hard
                  </button>
                  <button
                    onClick={() => handleSubmitAnswer(1.0)}
                    className="py-1.5 bg-[#3D5A45]/10 hover:bg-[#3D5A45]/20 text-[#3D5A45] border border-[#3D5A45]/30 rounded font-mono"
                  >
                    1.0 - Easy
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={fetchNextQuestion}
                className="px-5 py-2.5 bg-[#3D5A45] hover:bg-[#2D4333] text-white font-medium rounded transition-colors text-xs"
              >
                Next Due Question →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

