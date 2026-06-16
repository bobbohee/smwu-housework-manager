"use client";

import { useMemo, useState } from "react";
import { GroupBar } from "@/components/group/GroupBar";
import { useActiveGroup } from "@/lib/hooks/useActiveGroup";
import { useChores } from "@/lib/hooks/useChores";
import { useChoreLog } from "@/lib/hooks/useChoreLog";
import {
  aggregateByChore,
  aggregateByMember,
} from "@/lib/chore/stats";
import { MemberBarChart } from "@/components/stats/MemberBarChart";
import { ChoreBarChart } from "@/components/stats/ChoreBarChart";

export default function StatsPage() {
  const { activeGroup, loading: groupLoading } = useActiveGroup();
  const { chores } = useChores();

  const [cursor, setCursor] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const { fromDate, toDate } = useMemo(() => {
    const from = new Date(cursor.year, cursor.month, 1, 0, 0, 0, 0);
    const to = new Date(cursor.year, cursor.month + 1, 1, 0, 0, 0, 0);
    return { fromDate: from, toDate: to };
  }, [cursor]);

  const { logs, loading: logsLoading } = useChoreLog({ fromDate, toDate });

  const memberStats = useMemo(
    () => aggregateByMember(logs, activeGroup?.memberUids ?? []),
    [logs, activeGroup?.memberUids],
  );
  const choreStats = useMemo(
    () => aggregateByChore(logs, chores),
    [logs, chores],
  );

  const totalCount = memberStats.reduce((sum, s) => sum + s.count, 0);

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const next = new Date(c.year, c.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return (
    <>
      <GroupBar />
      <div className="mx-auto max-w-3xl px-6 py-7 md:px-10 md:py-9">
        <h1 className="mb-6 flex items-center gap-2 text-lg font-bold text-foreground">
          <span>📊</span>
          <span>통계</span>
        </h1>

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
        ) : totalCount === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">📊</span>
            <p className="text-sm text-muted">
              이번 달은 아직 완료 기록이 없습니다.
            </p>
          </div>
        ) : (
          <div className="mt-10 space-y-14">
            <MemberBarChart
              stats={memberStats}
              memberNames={activeGroup.memberNames}
            />
            <ChoreBarChart stats={choreStats} />
          </div>
        )}
      </div>
    </>
  );
}
