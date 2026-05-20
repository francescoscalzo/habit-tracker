import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStats, checkIn } from '../services/habitApi';
import type { Habit, HabitStats } from '../types';
import { Loader2 } from 'lucide-react';

interface HabitCardProps {
  habit: Habit;
}

export default function HabitCard({ habit }: HabitCardProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<HabitStats | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    getStats(habit.id)
      .then((s) => {
        setStats(s);
        setCheckedIn(s.last30days[0]);
        setStreak(s.currentStreak);
      })
      .catch(() => {});
  }, [habit.id]);

  async function handleCheckIn(e: React.MouseEvent) {
    e.stopPropagation();
    if (checkedIn || checkingIn) return;

    setCheckingIn(true);
    const prevStreak = streak;

    setCheckedIn(true);
    setStreak((s) => s + 1);

    try {
      await checkIn(habit.id);
    } catch (err) {
      if (err instanceof Error && err.message === 'Already done today') {
        setCheckedIn(true);
      } else {
        setCheckedIn(false);
        setStreak(prevStreak);
      }
    } finally {
      setCheckingIn(false);
    }
  }

  return (
    <div
      onClick={() => navigate(`/habits/${habit.id}`)}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 cursor-pointer hover:border-zinc-700 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl" role="img" aria-label={habit.name}>
            {habit.emoji}
          </span>
          <div>
            <h3 className="text-white font-semibold text-lg group-hover:text-emerald-400 transition-colors">
              {habit.name}
            </h3>
            {stats !== null && (
              <p className="text-zinc-400 text-sm mt-0.5">
                {streak > 0 ? (
                  <>
                    <span className="text-orange-400">&#x1F525;</span> {streak} day{streak !== 1 ? 's' : ''}
                  </>
                ) : (
                  'No streak yet'
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleCheckIn}
        disabled={checkedIn || checkingIn}
        aria-label={checkedIn ? 'Already checked in today' : 'Check in today'}
        className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
          checkedIn
            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98]'
        }`}
      >
        {checkingIn ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : checkedIn ? (
          'Done today \u2713'
        ) : (
          'Check in \u2713'
        )}
      </button>
    </div>
  );
}
