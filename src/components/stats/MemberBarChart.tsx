import type { MemberStat } from "@/lib/chore/stats";
import { COLOR_PALETTE } from "@/lib/chore/operations";

export interface MemberBarChartProps {
  stats: MemberStat[];
  memberNames: Record<string, string>;
}

const BAR_MAX_PX = 100;

export function MemberBarChart({ stats, memberNames }: MemberBarChartProps) {
  const max = Math.max(1, ...stats.map((s) => s.count));

  return (
    <section>
      <p className="mb-3 text-xs font-semibold text-muted">멤버별 완료 횟수</p>

      <div
        className="mb-3 flex items-end justify-center gap-6 px-2"
        style={{ height: `${BAR_MAX_PX + 24}px` }}
      >
        {stats.map((s, i) => {
          const heightPx = Math.round((s.count / max) * BAR_MAX_PX);
          const color = COLOR_PALETTE[i % COLOR_PALETTE.length];
          return (
            <div
              key={s.uid}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-[11px] font-semibold text-foreground">
                {s.count}
              </span>
              <div
                className="w-10 rounded-t-md border"
                style={{
                  height: `${heightPx}px`,
                  backgroundColor: color + "80",
                  borderColor: color,
                }}
              />
              <span className="max-w-[60px] truncate text-[11px] text-muted">
                {memberNames[s.uid] ?? s.uid.slice(0, 4)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid grid-cols-2 border-b border-border px-3 py-2 text-[12px] font-semibold text-muted">
          <span>멤버</span>
          <span className="text-right">완료 횟수</span>
        </div>
        {stats.map((s) => (
          <div
            key={s.uid}
            className="grid grid-cols-2 border-b border-border px-3 py-2 text-[13px] text-foreground last:border-b-0"
          >
            <span>{memberNames[s.uid] ?? s.uid.slice(0, 4)}</span>
            <span className="text-right font-semibold">{s.count}회</span>
          </div>
        ))}
      </div>
    </section>
  );
}
