import { useState } from 'react';

interface HabitHeatmapProps {
  last90days: boolean[];
}

export default function HabitHeatmap({ last90days }: HabitHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ date: string; checked: boolean; x: number; y: number } | null>(null);

  const today = new Date();
  const cells: { date: Date; checked: boolean }[] = [];

  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    cells.push({ date: d, checked: last90days[89 - i] });
  }

  const weeks: { date: Date; checked: boolean }[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const monthLabels: { label: string; colSpan: number; startCol: number }[] = [];
  let currentMonth = -1;
  let spanStart = 0;

  weeks.forEach((week, i) => {
    const month = week[0].date.getMonth();
    if (month !== currentMonth) {
      if (currentMonth !== -1) {
        monthLabels.push({
          label: new Date(2024, currentMonth).toLocaleString('en', { month: 'short' }),
          colSpan: i - spanStart,
          startCol: spanStart,
        });
      }
      currentMonth = month;
      spanStart = i;
    }
  });
  if (currentMonth !== -1) {
    monthLabels.push({
      label: new Date(2024, currentMonth).toLocaleString('en', { month: 'short' }),
      colSpan: weeks.length - spanStart,
      startCol: spanStart,
    });
  }

  function formatDate(d: Date): string {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function handleCellClick(e: React.MouseEvent, date: Date, checked: boolean) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      date: formatDate(date),
      checked,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    setTimeout(() => setTooltip(null), 2000);
  }

  return (
    <div className="relative">
      <div className="overflow-x-auto pb-2 -mx-1">
        <div className="inline-block min-w-[520px]">
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)` }}>
            {monthLabels.map((m) => (
              <div
                key={`${m.label}-${m.startCol}`}
                className="text-[10px] text-zinc-500 mb-1"
                style={{ gridColumn: `${m.startCol + 1} / span ${m.colSpan}` }}
              >
                {m.label}
              </div>
            ))}
          </div>
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${weeks.length}, 1fr)`, gridTemplateRows: 'repeat(7, 1fr)' }}
          >
            {weeks.flatMap((week, colIdx) =>
              week.map((cell, rowIdx) => (
                <button
                  key={`${colIdx}-${rowIdx}`}
                  onClick={(e) => handleCellClick(e, cell.date, cell.checked)}
                  aria-label={`${formatDate(cell.date)}: ${cell.checked ? 'completed' : 'missed'}`}
                  className={`w-[14px] h-[14px] rounded-[3px] transition-colors ${
                    cell.checked
                      ? 'bg-emerald-500 hover:bg-emerald-400'
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {tooltip && (
        <div
          className="fixed z-50 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white shadow-xl pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 40,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="font-medium">{tooltip.date}</div>
          <div className={tooltip.checked ? 'text-emerald-400' : 'text-zinc-400'}>
            {tooltip.checked ? 'Completed' : 'Missed'}
          </div>
        </div>
      )}
    </div>
  );
}
