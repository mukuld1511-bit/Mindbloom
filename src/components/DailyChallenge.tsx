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
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Background Accent glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Daily Knowledge Challenge</h3>
            <span className="text-xs text-indigo-300 font-mono">Topic: {challenge.entityName || 'Core Science'}</span>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center space-x-1">
          <Award className="w-3.5 h-3.5" />
          <span>+{bonusPoints} XP Mastery</span>
        </span>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-slate-200 font-medium leading-relaxed">
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
                    className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                      selectedOption === opt
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
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
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!selectedOption}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center space-x-2 transition-all disabled:opacity-40"
              >
                <span>Claim XP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <div
            className={`p-4 rounded-xl border text-xs space-y-1 ${
              isCorrect
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2 font-bold text-sm">
              {isCorrect ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <ShieldAlert className="w-5 h-5 text-rose-400" />}
              <span>{isCorrect ? 'Challenge Solved! +150 XP Added.' : 'Incorrect.'}</span>
            </div>
            <p className="opacity-90">Answer: {challenge.correctAnswer}</p>
          </div>
        )}
      </div>
    </div>
  );
};
