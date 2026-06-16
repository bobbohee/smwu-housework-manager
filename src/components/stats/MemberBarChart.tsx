import type { MemberStat } from "@/lib/chore/stats";

export interface MemberBarChartProps {
  stats: MemberStat[];
  memberNames: Record<string, string>;
}

const BAR_MAX_PX = 100;
// 파랑 계열, 진한→연한. 높은 카운트가 진한 톤.
const BLUE_SHADES = [
  "#1d4ed8", // blue-700
  "#2563eb", // blue-600
  "#3b82f6", // blue-500
  "#60a5fa", // blue-400
  "#93c5fd", // blue-300
] as const;

export function MemberBarChart({ stats, memberNames }: MemberBarChartProps) {
  const max = Math.max(1, ...stats.map((s) => s.count));

  // dense rank: 동일 count → 동일 진하기. count desc 정렬 후 매김.
  const rankByUid = new Map<string, number>();
  const sortedByCount = [...stats].sort((a, b) => b.count - a.count);
  let prev = Number.NaN;
  let rank = -1;
  for (const s of sortedByCount) {
    if (s.count !== prev) {
      rank++;
      prev = s.count;
    }
    rankByUid.set(s.uid, rank);
  }

  return (
    <section>
      <p className="mb-3 text-xs font-semibold text-muted">멤버별 완료 횟수</p>

      <div
        className="mb-6 flex items-end justify-center gap-6 px-2"
        style={{ height: `${BAR_MAX_PX + 24}px` }}
      >
        {stats.map((s) => {
          const heightPx = Math.round((s.count / max) * BAR_MAX_PX);
          const shadeIdx = Math.min(
            rankByUid.get(s.uid) ?? 0,
            BLUE_SHADES.length - 1,
          );
          const color = BLUE_SHADES[shadeIdx];
          return (
            <div
              key={s.uid}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-sm font-semibold text-foreground">
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
              <span className="max-w-[60px] truncate text-sm text-muted">
                {memberNames[s.uid] ?? s.uid.slice(0, 4)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid grid-cols-2 border-b border-border px-3 py-2 text-sm font-semibold text-muted">
          <span>멤버</span>
          <span className="text-right">완료 횟수</span>
        </div>
        {stats.map((s) => (
          <div
            key={s.uid}
            className="grid grid-cols-2 border-b border-border px-3 py-2 text-sm text-foreground last:border-b-0"
          >
            <span>{memberNames[s.uid] ?? s.uid.slice(0, 4)}</span>
            <span className="text-right font-semibold">{s.count}회</span>
          </div>
        ))}
      </div>
    </section>
  );
}
