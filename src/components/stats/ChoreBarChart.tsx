import type { ChoreStat } from "@/lib/chore/stats";

export interface ChoreBarChartProps {
  stats: ChoreStat[];
}

export function ChoreBarChart({ stats }: ChoreBarChartProps) {
  return (
    <section>
      <p className="mb-3 text-xs font-semibold text-muted">집안일별 완료 횟수</p>

      <div className="flex flex-col gap-2.5">
        {stats.map((s) => (
          <div
            key={s.choreId}
            className="flex items-center gap-2.5"
          >
            <span className="flex w-20 shrink-0 items-center gap-1.5 truncate text-sm text-foreground">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              <span className="truncate">{s.name}</span>
            </span>
            <div className="flex-1 overflow-hidden rounded-md border border-border bg-surface">
              <div
                className="h-5 rounded-md"
                style={{
                  width: `${Math.max(s.percent, s.count > 0 ? 4 : 0)}%`,
                  backgroundColor: s.color + "8C",
                }}
              />
            </div>
            <span className="w-7 text-right text-sm text-muted">
              {s.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
