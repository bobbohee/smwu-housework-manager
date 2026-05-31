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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user) {
      setGroups([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // array-contains 쿼리: rule (memberUids has uid) 와 정확히 align → Firestore secure-query 통과.
    // documentId() in [...] 방식은 제약과 rule 불일치로 permission-denied.
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
        setLoading(false);
      },
      (err) => {
        setError(`그룹 조회 실패: ${err.code}`);
        setLoading(false);
      },
    );
    return unsub;
  }, [user, authLoading]);

  return { groups, loading, error };
}
