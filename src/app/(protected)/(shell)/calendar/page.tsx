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
  // 페이지 하단 "완료 기록" 섹션에 표시할 날짜. 초기값 = 오늘.
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    toISO(new Date()),
  );
  // 셀 클릭 시 다이얼로그도 함께 띄움.
  const [dialogDate, setDialogDate] = useState<string | null>(null);

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

  const cells = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month),
    [cursor],
  );

  const selectedLogs = logsByDate.get(selectedDate) ?? [];
  const dialogLogs = dialogDate ? logsByDate.get(dialogDate) ?? [] : [];

  return (
    <>
      <GroupBar />
      <div className="mx-auto max-w-3xl px-4 pb-6 md:px-6 md:pb-8">
        {/* 월 네비게이션 — 와이어와 동일하게 좌우 ◀▶ + 중앙 라벨 */}
        <div className="flex items-center justify-between border-b border-border py-3.5">
          <button
            onClick={() => shiftMonth(-1)}
            className="px-2 text-lg text-muted hover:text-foreground"
            aria-label="이전 달"
          >
            ◀
          </button>
          <span className="text-base font-bold text-foreground">
            {cursor.year}년 {cursor.month + 1}월
          </span>
          <button
            onClick={() => shiftMonth(1)}
            className="px-2 text-lg text-muted hover:text-foreground"
            aria-label="다음 달"
          >
            ▶
          </button>
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
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1 px-3 pt-2.5 pb-1.5 text-center">
              {WEEKDAY_HEADERS.map((label, i) => (
                <div
                  key={label}
                  className={[
                    "text-[11px] font-semibold",
                    i === 0 && "text-chore-red",
                    i === 6 && "text-brand",
                    i !== 0 && i !== 6 && "text-muted",
                  ].filter(Boolean).join(" ")}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 — gap-1, 셀 내부 박스 없음, 선택 시 brand/10 배경 */}
            <div className="grid grid-cols-7 gap-1 px-3 pb-2 text-center">
              {cells.map((cell) => {
                const cellLogs = logsByDate.get(cell.iso) ?? [];
                return (
                  <DayCell
                    key={cell.iso}
                    cell={cell}
                    logs={cellLogs}
                    choreById={choreById}
                    selected={cell.iso === selectedDate}
                    onClick={() => {
                      setSelectedDate(cell.iso);
                      setDialogDate(cell.iso);
                    }}
                  />
                );
              })}
            </div>

            {/* 선택한 날짜의 완료 기록 리스트 */}
            <div className="border-t border-border px-1 pt-3">
              <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">
                {formatHumanDate(selectedDate)} 완료 기록
              </p>
              {selectedLogs.length === 0 ? (
                <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-xs text-muted">
                  이 날짜의 완료 기록이 없습니다.
                </p>
              ) : (
                <ul className="space-y-2">
                  {selectedLogs.map((log) => (
                    <LogRow
                      key={log.id}
                      log={log}
                      chore={choreById.get(log.choreId)}
                      group={activeGroup}
                      onClick={() => setDialogDate(selectedDate)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {dialogDate && activeGroup && (
        <LogDetailDialog
          date={dialogDate}
          logs={dialogLogs}
          choreById={choreById}
          group={activeGroup}
          onClose={() => setDialogDate(null)}
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
  selected,
  onClick,
}: {
  cell: DayCellInfo;
  logs: ChoreLogDoc[];
  choreById: Map<string, ChoreDoc>;
  selected: boolean;
  onClick: () => void;
}) {
  const visible = logs.slice(0, 4);
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex flex-col items-center gap-1 rounded-md py-1.5 text-xs transition hover:bg-surface-2",
        !cell.isCurrentMonth && "opacity-40",
        selected && "bg-brand/10",
      ].filter(Boolean).join(" ")}
    >
      <span
        className={[
          "text-[11px] font-semibold",
          cell.isToday
            ? "rounded-full bg-brand px-1.5 py-0.5 text-brand-foreground"
            : selected
              ? "text-brand"
              : cell.weekday === 0
                ? "text-chore-red"
                : cell.weekday === 6
                  ? "text-brand"
                  : "text-foreground",
        ].join(" ")}
      >
        {cell.day}
      </span>
      <div className="flex min-h-[8px] flex-wrap items-center justify-center gap-[3px]">
        {visible.map((log) => {
          const chore = choreById.get(log.choreId);
          const color = chore?.color ?? "#95A5A6";
          return (
            <span
              key={log.id}
              className="h-[5px] w-[5px] rounded-full"
              style={
                log.active
                  ? { backgroundColor: color }
                  : {
                      backgroundColor: "transparent",
                      border: `1px dashed ${color}`,
                    }
              }
              title={chore?.name ?? "삭제된 집안일"}
            />
          );
        })}
      </div>
    </button>
  );
}

function LogRow({
  log,
  chore,
  group,
  onClick,
}: {
  log: ChoreLogDoc;
  chore: ChoreDoc | undefined;
  group: { memberNames?: Record<string, string> };
  onClick: () => void;
}) {
  const nameOf = (uid: string) => group.memberNames?.[uid] ?? uid.slice(0, 6);
  const time = log.completedAt?.toMillis?.()
    ? new Date(log.completedAt.toMillis()).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const color = chore?.color ?? "#95A5A6";

  if (!log.active) {
    return (
      <li
        onClick={onClick}
        className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2.5 opacity-75"
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-dim"
          aria-hidden
        />
        <span className="flex-1 text-sm">
          <span className="font-semibold text-dim line-through">
            {chore?.name ?? "(삭제된 집안일)"}
          </span>
          <span className="text-dim"> : {nameOf(log.completedBy)}</span>
        </span>
        <span className="text-[10px] font-semibold text-chore-red">비활성화</span>
      </li>
    );
  }

  return (
    <li
      onClick={onClick}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5"
      style={{
        backgroundColor: hexAlpha(color, 10),
        borderColor: hexAlpha(color, 35),
      }}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="flex-1 text-sm">
        <span className="font-semibold text-foreground">
          {chore?.name ?? "(삭제된 집안일)"}
        </span>
        <span className="text-muted"> : {nameOf(log.completedBy)}</span>
      </span>
      <span className="text-[10px] text-muted">{time}</span>
    </li>
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

function formatHumanDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${m}월 ${d}일 (${day})`;
}

function hexAlpha(hex: string, pct: number): string {
  const a = Math.round((pct / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
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
