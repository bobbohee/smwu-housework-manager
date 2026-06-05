"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Timestamp,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { choreLogCol } from "@/lib/firebase/collections";
import type { ChoreLogDoc } from "@/lib/types/firestore";
import { useActiveGroup } from "@/lib/hooks/useActiveGroup";

export interface UseChoreLogOptions {
  /** 선택적 월 필터 (로컬 자정 기준 시작/끝). 미지정 시 전체 로그. */
  fromDate?: Date;
  toDate?: Date;
}

export interface UseChoreLogResult {
  logs: ChoreLogDoc[];
  loading: boolean;
  error: string | null;
}

/**
 * 그룹의 choreLog 구독.
 * - 보안 쿼리: where("groupId", "==", activeGroupId)
 * - 시간 범위는 클라이언트 측 필터 (인덱스 추가 회피, 한 그룹 로그량은 제한적)
 * - 정렬: completedAt 최신순
 */
export function useChoreLog(opts: UseChoreLogOptions = {}): UseChoreLogResult {
  const { activeGroupId, loading: groupLoading } = useActiveGroup();
  const [logs, setLogs] = useState<ChoreLogDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  const loading = groupLoading || (!!activeGroupId && !subscribed);

  const fromMs = opts.fromDate?.getTime();
  const toMs = opts.toDate?.getTime();

  useEffect(() => {
    if (groupLoading || !activeGroupId) return undefined;

    const q = query(
      choreLogCol(),
      where("groupId", "==", activeGroupId),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => d.data());
        arr.sort((a, b) => {
          const aMs = toMillis(a.completedAt);
          const bMs = toMillis(b.completedAt);
          return bMs - aMs; // 최신순
        });
        setLogs(arr);
        setError(null);
        setSubscribed(true);
      },
      (err) => {
        setError(`완료 기록 조회 실패: ${err.code}`);
        setSubscribed(true);
      },
    );
    return () => {
      unsub();
      setSubscribed(false);
      setLogs([]);
    };
  }, [activeGroupId, groupLoading]);

  const filtered = useMemo(() => {
    if (fromMs === undefined && toMs === undefined) return logs;
    return logs.filter((log) => {
      const t = toMillis(log.completedAt);
      if (fromMs !== undefined && t < fromMs) return false;
      if (toMs !== undefined && t > toMs) return false;
      return true;
    });
  }, [logs, fromMs, toMs]);

  return { logs: filtered, loading, error };
}

function toMillis(ts: Timestamp | undefined): number {
  return ts?.toMillis?.() ?? 0;
}
