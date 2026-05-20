import { useState } from 'react';
import { X } from 'lucide-react';
import { createHabit } from '../services/habitApi';
import type { Habit } from '../types';

const EMOJI_CATEGORIES = [
  {
    label: 'Fitness',
    emojis: ['🏃', '🏋️', '🚴', '🧘', '🤸', '🏊', '⚽', '🎾', '🥊', '🧗', '🚶', '🤾'],
  },
  {
    label: 'Mente',
    emojis: ['📚', '📖', '🧠', '🎵', '🎨', '✍️', '💻', '🎯', '🧩', '♟️', '🎭', '📝'],
  },
  {
    label: 'Salute',
    emojis: ['💧', '🥗', '🥤', '😴', '🛌', '💊', '🧘', '🫁', '🥦', '🍎', '🧃', '🌿'],
  },
  {
    label: 'Abitudini',
    emojis: ['🌅', '🧹', '🌱', '🌳', '💰', '🙏', '❤️', '⭐', '🔥', '✅', '📅', '⏰'],
  },
  {
    label: 'Lavoro',
    emojis: ['💼', '📊', '📈', '🖥️', '📧', '📞', '🤝', '💡', '🗂️', '✏️', '🖊️', '📌'],
  },
];

interface Props {
  onAdd: (habit: Habit) => void;
  onClose: () => void;
}

export default function AddHabitModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !selectedEmoji) return;
    setSaving(true);
    setError('');
    try {
      const habit = await createHabit(name.trim(), selectedEmoji);
      onAdd(habit);
    } catch {
      setError('Errore nella creazione. Riprova.');
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold text-white">Nuova abitudine</h2>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 pb-6 overflow-y-auto">

          {/* Preview + Name */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-3xl flex-shrink-0 select-none">
              {selectedEmoji || <span className="text-zinc-600 text-sm text-center leading-tight">scegli emoji</span>}
            </div>
            <input
              type="text"
              placeholder="Nome abitudine…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              required
              autoFocus
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Emoji picker */}
          <div className="flex flex-col gap-3">
            {EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  {cat.label}
                </p>
                <div className="grid grid-cols-6 gap-1.5">
                  {cat.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`h-11 rounded-xl text-2xl flex items-center justify-center transition-all active:scale-90 ${
                        selectedEmoji === emoji
                          ? 'bg-emerald-600 ring-2 ring-emerald-400 ring-offset-1 ring-offset-zinc-900'
                          : 'bg-zinc-800 hover:bg-zinc-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-3">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !name.trim() || !selectedEmoji}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all active:scale-[0.98]"
          >
            {saving ? 'Salvataggio…' : 'Aggiungi abitudine'}
          </button>
        </form>
      </div>
    </div>
  );
}
