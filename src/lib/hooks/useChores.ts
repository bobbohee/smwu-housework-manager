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
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  const loading = groupLoading || (!!activeGroupId && !subscribed);

  useEffect(() => {
    if (groupLoading || !activeGroupId) return undefined;

    // groupId 동등 쿼리. Rules의 isGroupMember(resource.data.groupId) 와 align.
    const q = query(choresCol(), where("groupId", "==", activeGroupId));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => d.data());
        arr.sort((a, b) => {
          const aMs = a.createdAt?.toMillis?.() ?? 0;
          const bMs = b.createdAt?.toMillis?.() ?? 0;
          return aMs - bMs;
        });
        setChores(arr);
        setError(null);
        setSubscribed(true);
      },
      (err) => {
        setError(`집안일 조회 실패: ${err.code}`);
        setSubscribed(true);
      },
    );
    return () => {
      unsub();
      setSubscribed(false);
      setChores([]);
    };
  }, [activeGroupId, groupLoading]);

  return { chores, loading, error };
}
