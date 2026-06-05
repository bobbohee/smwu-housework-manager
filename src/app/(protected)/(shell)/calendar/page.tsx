"use client";

import { useMemo, useState } from "react";
import { GroupBar } from "@/components/group/GroupBar";
import { useActiveGroup } from "@/lib/hooks/useActiveGroup";
import { useChores } from "@/lib/hooks/useChores";
import { useChoreLog } from "@/lib/hooks/useChoreLog";
import { LogDetailDialog } from "@/components/chore/LogDetailDialog";
import type { ChoreDoc, ChoreLogDoc } from "@/lib/types/firestore";

const WEEKDAY_HEADERS = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarPage() {
  const { activeGroup, loading: groupLoading } = useActiveGroup();
  const { chores } = useChores();
  const { logs, loading: logsLoading, error } = useChoreLog();

  const [cursor, setCursor] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const choreById = useMemo(() => {
    const map = new Map<string, ChoreDoc>();
    for (const c of chores) map.set(c.id, c);
    return map;
  }, [chores]);

  const logsByDate = useMemo(() => groupLogsByLocalDate(logs), [logs]);

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const next = new Date(c.year, c.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }
  function goToday() {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
  }

  const cells = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor],
  );

  const selectedLogs = selectedDate ? logsByDate.get(selectedDate) ?? [] : [];

  return (
    <>
      <GroupBar />
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">캘린더</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() => shiftMonth(-1)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm hover:bg-background"
              aria-label="이전 달"
            >
              ◀
            </button>
            <span className="min-w-[6.5rem] text-center text-sm font-semibold text-foreground">
              {cursor.year}년 {cursor.month + 1}월
            </span>
            <button
              onClick={() => shiftMonth(1)}
              className="rounded-md border border-border bg-surface px-2 py-1 text-sm hover:bg-background"
              aria-label="다음 달"
            >
              ▶
            </button>
            <button
              onClick={goToday}
              className="ml-1 rounded-md border border-border bg-surface px-2 py-1 text-xs hover:bg-background"
            >
              오늘
            </button>
          </div>
        </div>

        {groupLoading || logsLoading ? (
          <p className="mt-6 text-sm text-muted">불러오는 중…</p>
        ) : !activeGroup ? (
          <p className="mt-6 text-sm text-muted">활성 그룹이 없습니다.</p>
        ) : error ? (
          <p className="mt-6 rounded-lg bg-chore-red/10 px-3 py-2 text-sm text-chore-red">
            {error}
          </p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-border text-xs">
              {WEEKDAY_HEADERS.map((label, i) => (
                <div
                  key={label}
                  className={[
                    "bg-surface px-1 py-1.5 text-center font-semibold",
                    i === 0 && "text-chore-red",
                    i === 6 && "text-brand",
                    i !== 0 && i !== 6 && "text-muted",
                  ].filter(Boolean).join(" ")}
                >
                  {label}
                </div>
              ))}
              {cells.map((cell) => {
                const cellLogs = logsByDate.get(cell.iso) ?? [];
                return (
                  <DayCell
                    key={cell.iso}
                    cell={cell}
                    logs={cellLogs}
                    choreById={choreById}
                    onClick={() => setSelectedDate(cell.iso)}
                  />
                );
              })}
            </div>

            <p className="mt-3 text-xs text-muted">
              날짜를 누르면 그날의 완료 기록을 볼 수 있습니다. 회색 점선은
              비활성화된 기록입니다.
            </p>
          </>
        )}
      </div>

      {selectedDate && activeGroup && (
        <LogDetailDialog
          date={selectedDate}
          logs={selectedLogs}
          choreById={choreById}
          group={activeGroup}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </>
  );
}

interface DayCellInfo {
  iso: string; // YYYY-MM-DD
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  weekday: number;
}

function DayCell({
  cell,
  logs,
  choreById,
  onClick,
}: {
  cell: DayCellInfo;
  logs: ChoreLogDoc[];
  choreById: Map<string, ChoreDoc>;
  onClick: () => void;
}) {
  const visible = logs.slice(0, 3);
  const extra = logs.length - visible.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-16 flex-col items-stretch bg-surface px-1.5 py-1 text-left transition hover:bg-background sm:h-20",
        !cell.isCurrentMonth && "opacity-40",
      ].filter(Boolean).join(" ")}
    >
      <span
        className={[
          "text-[11px] font-semibold",
          cell.isToday
            ? "self-start rounded-full bg-brand px-1.5 text-brand-foreground"
            : cell.weekday === 0
              ? "text-chore-red"
              : cell.weekday === 6
                ? "text-brand"
                : "text-foreground",
        ].join(" ")}
      >
        {cell.day}
      </span>
      <div className="mt-auto flex flex-wrap gap-0.5">
        {visible.map((log) => {
          const chore = choreById.get(log.choreId);
          const color = chore?.color ?? "#95A5A6";
          return (
            <span
              key={log.id}
              className={[
                "h-1.5 w-1.5 rounded-full",
                !log.active && "ring-1 ring-inset ring-muted",
              ].filter(Boolean).join(" ")}
              style={{
                backgroundColor: log.active ? color : "transparent",
                borderColor: !log.active ? color : undefined,
                borderWidth: !log.active ? 1 : undefined,
                borderStyle: !log.active ? "dashed" : undefined,
              }}
              title={chore?.name ?? "삭제된 집안일"}
            />
          );
        })}
        {extra > 0 && (
          <span className="text-[9px] font-bold text-muted">+{extra}</span>
        )}
      </div>
    </button>
  );
}

function buildMonthGrid(year: number, month: number): DayCellInfo[] {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const gridStart = new Date(year, month, 1 - startWeekday);

  const todayStr = toISO(new Date());
  const cells: DayCellInfo[] = [];
  // 6주 = 42칸 (월 표시 안정)
  for (let i = 0; i < 42; i++) {
    const d = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
    );
    const iso = toISO(d);
    cells.push({
      iso,
      day: d.getDate(),
      isCurrentMonth: d.getMonth() === month,
      isToday: iso === todayStr,
      weekday: d.getDay(),
    });
  }
  return cells;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function groupLogsByLocalDate(logs: ChoreLogDoc[]): Map<string, ChoreLogDoc[]> {
  const map = new Map<string, ChoreLogDoc[]>();
  for (const log of logs) {
    const ms = log.completedAt?.toMillis?.();
    if (!ms) continue;
    const iso = toISO(new Date(ms));
    const list = map.get(iso) ?? [];
    list.push(log);
    map.set(iso, list);
  }
  return map;
}

