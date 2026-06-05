"use client";

import { useEffect, useState } from "react";
import { onSnapshot, query, where } from "firebase/firestore";
import { groupsCol } from "@/lib/firebase/collections";
import type { GroupDoc } from "@/lib/types/firestore";
import { useAuth } from "@/lib/hooks/useAuth";

export interface UseGroupsResult {
  groups: GroupDoc[];
  loading: boolean;
  error: string | null;
}

export function useGroups(): UseGroupsResult {
  const { user, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  // loading은 derived: 인증 로딩 중이거나, 사용자 있음에도 첫 스냅샷 도착 전.
  const loading = authLoading || (!!user && !subscribed);

  useEffect(() => {
    if (authLoading || !user) return undefined;

    // array-contains 쿼리: rule (memberUids has uid) 와 정확히 align → Firestore secure-query 통과.
    const q = query(
      groupsCol(),
      where("memberUids", "array-contains", user.uid),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => d.data());
        // 생성일 오래된 순 정렬 (createdAt이 serverTimestamp인 동안 null일 수 있음)
        arr.sort((a, b) => {
          const aMs = a.createdAt?.toMillis?.() ?? 0;
          const bMs = b.createdAt?.toMillis?.() ?? 0;
          return aMs - bMs;
        });
        setGroups(arr);
        setError(null);
        setSubscribed(true);
      },
      (err) => {
        setError(`그룹 조회 실패: ${err.code}`);
        setSubscribed(true);
      },
    );
    return () => {
      unsub();
      setSubscribed(false);
      setGroups([]);
    };
  }, [user, authLoading]);

  return { groups, loading, error };
}
