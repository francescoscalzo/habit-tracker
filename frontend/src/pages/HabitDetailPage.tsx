import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getStats } from '../services/habitApi';
import HabitHeatmap from '../components/HabitHeatmap';
import type { HabitStats } from '../types';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [stats, setStats] = useState<HabitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getStats(id)
      .then(setStats)
      .catch((err) => {
        if (err.message === 'Unauthorized') {
          navigate('/login', { state: { from: { pathname: `/habits/${id}` } } });
        } else {
          setError('Failed to load stats');
        }
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">{error || 'Stats not found'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            aria-label="Back to dashboard"
            className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-white tracking-tight">Habit Detail</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{stats.currentStreak}</div>
              <div className="text-xs text-zinc-500 mt-1">Current Streak</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.longestStreak}</div>
              <div className="text-xs text-zinc-500 mt-1">Longest Streak</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{Math.round(stats.successRate * 100)}%</div>
              <div className="text-xs text-zinc-500 mt-1">Success Rate</div>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-sm font-medium text-zinc-400 mb-4">90-Day Activity</h2>
          <HabitHeatmap last90days={stats.last90days} />
        </div>
      </main>
    </div>
  );
}
