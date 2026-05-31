"use client";

import { useEffect, useState } from "react";
import {
  documentId,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { groupsCol } from "@/lib/firebase/collections";
import type { GroupDoc } from "@/lib/types/firestore";
import { useUserDoc } from "@/lib/hooks/useUserDoc";

export interface UseGroupsResult {
  groups: GroupDoc[];
  loading: boolean;
  error: string | null;
}

const FIRESTORE_IN_LIMIT = 30;

export function useGroups(): UseGroupsResult {
  const { userDoc, loading: userDocLoading } = useUserDoc();
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userDocLoading) {
      setLoading(true);
      return;
    }
    const ids = userDoc?.groupIds ?? [];
    if (ids.length === 0) {
      setGroups([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const sliced = ids.slice(0, FIRESTORE_IN_LIMIT);
    const q = query(groupsCol(), where(documentId(), "in", sliced));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => d.data());
        arr.sort((a, b) => sliced.indexOf(a.id) - sliced.indexOf(b.id));
        setGroups(arr);
        setLoading(false);
      },
      (err) => {
        setError(`그룹 조회 실패: ${err.code}`);
        setLoading(false);
      },
    );
    return unsub;
  }, [userDoc?.groupIds, userDocLoading]);

  return { groups, loading, error };
}
