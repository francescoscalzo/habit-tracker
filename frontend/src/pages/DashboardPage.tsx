import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHabits } from '../services/habitApi';
import { useAuth } from '../context/AuthContext';
import HabitCard from '../components/HabitCard';
import CoachDrawer from '../components/CoachDrawer';
import AddHabitModal from '../components/AddHabitModal';
import type { Habit } from '../types';
import { LogOut, MessageCircle, Plus } from 'lucide-react';

function SkeletonCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-zinc-800 rounded-lg" />
        <div className="flex-1">
          <div className="h-5 bg-zinc-800 rounded w-24 mb-2" />
          <div className="h-4 bg-zinc-800 rounded w-16" />
        </div>
      </div>
      <div className="h-10 bg-zinc-800 rounded-xl" />
    </div>
  );
}

export default function DashboardPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    getHabits()
      .then(setHabits)
      .catch((err) => {
        if (err.message === 'Unauthorized') {
          navigate('/login', { state: { from: { pathname: '/' } } });
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  function handleHabitAdded(habit: Habit) {
    setHabits((prev) => [habit, ...prev]);
    setModalOpen(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white tracking-tight">Habit Tracker</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setModalOpen(true)}
              aria-label="Aggiungi abitudine"
              className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              aria-label="Esci"
              className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : habits.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🌱</p>
            <p className="text-zinc-400 text-lg font-medium">Nessuna abitudine ancora.</p>
            <p className="text-zinc-600 text-sm mt-1">Tocca + per aggiungere la tua prima abitudine.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-6 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-all"
            >
              Aggiungi abitudine
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {habits.map((habit) => (
              <HabitCard key={habit.id} habit={habit} />
            ))}
          </div>
        )}
      </main>

      {/* FAB coach */}
      <button
        onClick={() => setDrawerOpen(true)}
        aria-label="Apri AI coach"
        className="fixed bottom-6 right-6 z-10 w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-600/25 flex items-center justify-center transition-all active:scale-95"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      <CoachDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {modalOpen && (
        <AddHabitModal onAdd={handleHabitAdded} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}
