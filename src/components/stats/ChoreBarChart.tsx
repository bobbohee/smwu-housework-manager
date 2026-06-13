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
            <span className="w-16 shrink-0 truncate text-[12px] text-foreground">
              {s.name}
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
            <span className="w-7 text-right text-[11px] text-muted">
              {s.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
