import React, { useState } from 'react';
import { Question } from '../types';
import { BrainCircuit, CheckCircle2, XCircle, HelpCircle, ArrowRight, RefreshCw, Calendar, Award } from 'lucide-react';

interface QuizViewProps {
  questions: Question[];
  onSubmitAnswer: (questionId: number, grade: float, answer: string) => Promise<any>;
  onRefresh: () => void;
}

export const QuizView: React.FC<QuizViewProps> = ({ questions, onSubmitAnswer, onRefresh }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string>('');
  const [userTextAnswer, setUserTextAnswer] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [lastGradeSubmitted, setLastGradeSubmitted] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const currentQ = questions[currentIndex];

  const handleChoiceSelect = (choice: string) => {
    if (showExplanation) return;
    setSelectedChoice(choice);
  };

  const handleVerifyAnswer = () => {
    setShowExplanation(true);
  };

  const handleGradeSubmit = async (grade: float) => {
    if (!currentQ || loading) return;
    setLoading(true);

    try {
      const answerGiven = selectedChoice || userTextAnswer;
      const res = await onSubmitAnswer(currentQ.id, grade, answerGiven);
      setLastGradeSubmitted(res);

      setTimeout(() => {
        setLoading(false);
        setShowExplanation(false);
        setSelectedChoice('');
        setUserTextAnswer('');
        setLastGradeSubmitted(null);

        if (currentIndex < questions.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          setCurrentIndex(0);
          onRefresh();
        }
      }, 1200);
    } catch (err) {
      setLoading(false);
    }
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E4E1D8] rounded-xl p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#EBF2EC] text-[#3D5A45] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="font-serif font-bold text-lg text-[#1C1B19]">All Spaced Repetition Cards Completed!</h2>
        <p className="text-xs text-[#6B6A63] max-w-md mx-auto">
          No questions due right now. Outstanding retention! Check back tomorrow or capture new articles to generate fresh cards.
        </p>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#3D5A45] text-white rounded-lg text-xs font-semibold hover:bg-[#2F4736]"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Check Queue Again
        </button>
      </div>
    );
  }

  const isMultipleChoice = currentQ.question_type === 'multiple_choice' || currentQ.question_type === 'true_false';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between font-mono text-xs text-[#6B6A63] bg-white border border-[#E4E1D8] p-4 rounded-xl">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-[#3D5A45]" />
          <span>Question {currentIndex + 1} of {questions.length}</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-[#3D5A45]" /> EF: {currentQ.easiness_factor.toFixed(2)}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#3D5A45]" /> Reps: {currentQ.repetitions}
          </span>
        </div>
      </div>

      {/* Main Flashcard */}
      <div className="bg-[#FFFFFF] border border-[#E4E1D8] rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Question Type Tag */}
        <div className="flex items-center justify-between border-b border-[#E4E1D8] pb-4">
          <span className="text-[11px] font-mono font-semibold uppercase px-2.5 py-1 rounded bg-[#F3F2EE] border border-[#E4E1D8] text-[#6B6A63]">
            {currentQ.question_type.replace('_', ' ')}
          </span>
          <span className="text-xs font-mono text-[#3D5A45]">
            Target Concept: <strong>{currentQ.target_entity}</strong>
          </span>
        </div>

        {/* Prompt */}
        <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1C1B19] leading-relaxed">
          {currentQ.prompt}
        </h3>

        {/* Choice Buttons or Input */}
        {isMultipleChoice ? (
          <div className="grid grid-cols-1 gap-3">
            {currentQ.choices.map((choice, idx) => {
              const isSelected = selectedChoice === choice;
              const isCorrect = choice.toLowerCase() === currentQ.correct_answer.toLowerCase();

              let btnStyle = "bg-[#FAFAF8] border-[#E4E1D8] text-[#1C1B19] hover:bg-[#F3F2EE]";
              if (isSelected) {
                btnStyle = "bg-[#EBF2EC] border-[#3D5A45] text-[#3D5A45] font-semibold";
              }
              if (showExplanation) {
                if (isCorrect) {
                  btnStyle = "bg-[#EBF2EC] border-[#3D5A45] text-[#3D5A45] font-semibold";
                } else if (isSelected && !isCorrect) {
                  btnStyle = "bg-[#FDF2F2] border-[#A23B3B] text-[#A23B3B]";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleChoiceSelect(choice)}
                  className={`w-full text-left p-3.5 rounded-lg border text-xs sm:text-sm transition-all flex items-center justify-between ${btnStyle}`}
                >
                  <span>{choice}</span>
                  {showExplanation && isCorrect && <CheckCircle2 className="w-4 h-4 text-[#3D5A45]" />}
                  {showExplanation && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-[#A23B3B]" />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              rows={3}
              placeholder="Type your response or recall here..."
              value={userTextAnswer}
              onChange={(e) => setUserTextAnswer(e.target.value)}
              disabled={showExplanation}
              className="w-full p-3 border border-[#E4E1D8] rounded-lg text-xs sm:text-sm bg-[#FAFAF8] focus:outline-none focus:border-[#3D5A45]"
            />
          </div>
        )}

        {/* Reveal & Explanation Area */}
        {!showExplanation ? (
          <button
            onClick={handleVerifyAnswer}
            disabled={isMultipleChoice && !selectedChoice}
            className="w-full py-3 bg-[#3D5A45] text-white rounded-lg text-xs sm:text-sm font-semibold hover:bg-[#2F4736] disabled:bg-[#A3B5A8] transition-colors"
          >
            Reveal Answer & SM-2 Grade Options
          </button>
        ) : (
          <div className="space-y-5 pt-4 border-t border-[#E4E1D8]">
            {/* Answer & Explanation */}
            <div className="p-4 bg-[#FAFAF8] border border-[#E4E1D8] rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#1C1B19]">
                <HelpCircle className="w-4 h-4 text-[#3D5A45]" />
                <span>Correct Answer:</span>
                <strong className="text-[#3D5A45]">{currentQ.correct_answer}</strong>
              </div>
              <p className="text-xs text-[#6B6A63] font-sans leading-relaxed">
                {currentQ.explanation}
              </p>
            </div>

            {/* SM-2 Performance Feedback Buttons */}
            <div>
              <label className="text-xs font-semibold text-[#1C1B19] block mb-2 font-serif">
                Rate your recall difficulty (SM-2 Algorithm Grade):
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Blackout', grade: 0.1, color: 'hover:bg-[#FDF2F2] hover:border-[#A23B3B] text-[#A23B3B]', desc: 'Complete loss' },
                  { label: 'Hard', grade: 0.4, color: 'hover:bg-[#FFF9E6] hover:border-[#D9A726] text-[#744210]', desc: 'Serious effort' },
                  { label: 'Good', grade: 0.75, color: 'hover:bg-[#EBF2EC] hover:border-[#3D5A45] text-[#3D5A45]', desc: 'Hesitation' },
                  { label: 'Perfect', grade: 1.0, color: 'hover:bg-[#EBF2EC] hover:border-[#3D5A45] text-[#3D5A45]', desc: 'Instant recall' }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleGradeSubmit(item.grade)}
                    disabled={loading}
                    className={`p-3 rounded-lg border border-[#E4E1D8] bg-white text-center transition-all ${item.color}`}
                  >
                    <div className="font-semibold text-xs">{item.label}</div>
                    <div className="text-[10px] text-[#6B6A63] font-mono mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {lastGradeSubmitted && (
              <div className="p-3 bg-[#EBF2EC] border border-[#D2E2D5] rounded-lg text-xs font-mono text-[#3D5A45] text-center">
                ✓ Recalculated! Next SM-2 Review scheduled in <strong>{lastGradeSubmitted.next_review_in_days} days</strong> (EF: {lastGradeSubmitted.new_easiness_factor}).
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
