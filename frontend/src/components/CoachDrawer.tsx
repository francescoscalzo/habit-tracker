import { useState, useRef, useEffect } from 'react';
import { streamCoachMessage } from '../services/coachApi';
import type { CoachMessage } from '../types';
import { X, Send, Bot, Loader2 } from 'lucide-react';

interface CoachDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function CoachDrawer({ open, onClose }: CoachDrawerProps) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput('');
      setStreaming(false);
    }
  }, [open]);

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: CoachMessage = { role: 'user', content: text };
    const assistantMsg: CoachMessage = { role: 'assistant', content: '' };
    const updated = [...messages, userMsg, assistantMsg];

    setMessages(updated);
    setInput('');
    setStreaming(true);

    try {
      await streamCoachMessage(
        updated.slice(0, -1),
        (token) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, content: last.content + token };
            return next;
          });
        },
        () => {
          setStreaming(false);
        }
      );
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: 'Coach unavailable. Try again.' };
        return next;
      });
      setStreaming(false);
    }
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed top-0 right-0 z-50 h-full bg-zinc-950 border-l border-zinc-800 transition-transform duration-300 ease-out w-full sm:w-[380px] flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-500" />
            <h2 className="text-white font-semibold">AI Coach</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close coach"
            className="p-2 text-zinc-400 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">Ask your AI coach anything about habits</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-md'
                    : 'bg-zinc-800 text-zinc-200 rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' && msg.content === '' && streaming ? (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-zinc-500">Thinking...</span>
                  </span>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-4 py-3 border-t border-zinc-800 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your coach..."
              disabled={streaming}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 transition-all text-sm"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              aria-label="Send message"
              className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
