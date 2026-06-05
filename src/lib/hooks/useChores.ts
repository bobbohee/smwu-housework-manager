"use client";

import { useEffect, useState } from "react";
import { onSnapshot, query, where } from "firebase/firestore";
import { choresCol } from "@/lib/firebase/collections";
import type { ChoreDoc } from "@/lib/types/firestore";
import { useActiveGroup } from "@/lib/hooks/useActiveGroup";

export interface UseChoresResult {
  chores: ChoreDoc[];
  loading: boolean;
  error: string | null;
}

export function useChores(): UseChoresResult {
  const { activeGroupId, loading: groupLoading } = useActiveGroup();
  const [chores, setChores] = useState<ChoreDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (groupLoading) {
      setLoading(true);
      return;
    }
    if (!activeGroupId) {
      setChores([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // groupId 동등 쿼리. Rules의 isGroupMember(resource.data.groupId) 와 align.
    const q = query(choresCol(), where("groupId", "==", activeGroupId));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => d.data());
        // 생성일 오래된 순 (홈 카드 순서 안정성).
        arr.sort((a, b) => {
          const aMs = a.createdAt?.toMillis?.() ?? 0;
          const bMs = b.createdAt?.toMillis?.() ?? 0;
          return aMs - bMs;
        });
        setChores(arr);
        setLoading(false);
      },
      (err) => {
        setError(`집안일 조회 실패: ${err.code}`);
        setLoading(false);
      },
    );
    return unsub;
  }, [activeGroupId, groupLoading]);

  return { chores, loading, error };
}
