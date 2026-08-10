import React, { useState, useEffect } from 'react';
import { Award, Zap, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';

interface DailyChallengeProps {
  onChallengeCompleted?: () => void;
}

export const DailyChallenge: React.FC<DailyChallengeProps> = ({ onChallengeCompleted }) => {
  const [challenge, setChallenge] = useState<any | null>(null);
  const [bonusPoints, setBonusPoints] = useState<number>(150);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/learn/challenge')
      .then((res) => res.json())
      .then((data) => {
        setChallenge(data.challenge);
        setBonusPoints(data.bonusPoints || 150);
      })
      .catch((err) => console.error('Failed to load daily challenge:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge) return;

    const correct = selectedOption.trim().toLowerCase() === challenge.correctAnswer.trim().toLowerCase();
    setIsCorrect(correct);
    setIsSubmitted(true);
    if (onChallengeCompleted) onChallengeCompleted();
  };

  if (isLoading || !challenge) return null;

  return (
    <div className="bg-[#FAFAF8] border border-[#E4E1D8] rounded p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-[#3D5A45]/10 text-[#3D5A45] rounded">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1C1B19]">Daily Knowledge Challenge</h3>
            <span className="text-xs text-[#6B6A63] font-mono">Topic: {challenge.entityName || 'Core Science'}</span>
          </div>
        </div>

        <span className="px-3 py-1 rounded bg-[#3D5A45]/10 text-[#3D5A45] border border-[#3D5A45]/20 text-xs font-bold flex items-center space-x-1">
          <Award className="w-3.5 h-3.5" />
          <span>+{bonusPoints} XP Mastery</span>
        </span>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-[#1C1B19] font-medium leading-relaxed">
          {challenge.questionText}
        </p>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            {challenge.options ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {challenge.options.map((opt: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedOption(opt)}
                    className={`p-3 rounded border text-xs font-medium text-left transition-all ${
                      selectedOption === opt
                        ? 'bg-[#3D5A45]/10 border-[#3D5A45] text-[#3D5A45] font-semibold'
                        : 'bg-[#FAFAF8] border-[#E4E1D8] text-[#1C1B19] hover:bg-[#F4F3EE]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                placeholder="Type answer..."
                value={selectedOption}
                onChange={(e) => setSelectedOption(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#E4E1D8] rounded p-3 text-xs text-[#1C1B19] placeholder-[#6B6A63] focus:outline-none focus:border-[#3D5A45]"
              />
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!selectedOption}
                className="px-5 py-2.5 bg-[#3D5A45] hover:bg-[#2D4333] text-white text-xs font-medium rounded flex items-center space-x-2 transition-colors disabled:opacity-40"
              >
                <span>Claim XP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <div
            className={`p-4 rounded border text-xs space-y-1 ${
              isCorrect
                ? 'bg-[#3D5A45]/10 border-[#3D5A45]/30 text-[#3D5A45]'
                : 'bg-[#A23B3B]/10 border-[#A23B3B]/30 text-[#A23B3B]'
            }`}
          >
            <div className="flex items-center space-x-2 font-bold text-sm">
              {isCorrect ? <CheckCircle2 className="w-5 h-5 text-[#3D5A45]" /> : <ShieldAlert className="w-5 h-5 text-[#A23B3B]" />}
              <span>{isCorrect ? 'Challenge Solved! +150 XP Added.' : 'Incorrect.'}</span>
            </div>
            <p className="opacity-90">Answer: {challenge.correctAnswer}</p>
          </div>
        )}
      </div>
    </div>
  );
};
