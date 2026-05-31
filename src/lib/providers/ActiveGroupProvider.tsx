"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { arrayRemove, updateDoc } from "firebase/firestore";
import { useGroups } from "@/lib/hooks/useGroups";
import { useUserDoc } from "@/lib/hooks/useUserDoc";
import { userRef } from "@/lib/firebase/collections";
import type { GroupDoc } from "@/lib/types/firestore";

const STORAGE_KEY = "smwu-active-group-id";

export interface ActiveGroupContextValue {
  groups: GroupDoc[];
  activeGroupId: string | null;
  activeGroup: GroupDoc | null;
  setActiveGroupId: (id: string) => void;
  loading: boolean;
  error: string | null;
}

export const ActiveGroupContext = createContext<ActiveGroupContextValue>({
  groups: [],
  activeGroupId: null,
  activeGroup: null,
  setActiveGroupId: () => {},
  loading: true,
  error: null,
});

export function ActiveGroupProvider({ children }: { children: ReactNode }) {
  const { groups, loading, error } = useGroups();
  const { userDoc } = useUserDoc();
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(null);

  // 강퇴 후 stale: users.groupIds에 본인이 이미 빠진 그룹 id가 남아 있을 수 있음.
  // groups는 array-contains(uid)로 실제 멤버십 = 진실의 원천. 둘 비교 후 차이 제거.
  useEffect(() => {
    if (loading || !userDoc) return;
    const actual = new Set(groups.map((g) => g.id));
    const stales = userDoc.groupIds.filter((id) => !actual.has(id));
    if (stales.length === 0) return;
    updateDoc(userRef(userDoc.uid), {
      groupIds: arrayRemove(...stales),
    }).catch((e) => {
      console.warn("[groupIds 자가 정리 실패]", e);
    });
  }, [loading, userDoc, groups]);

  // localStorage 초기값 1회 hydrate
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setActiveGroupIdState(stored);
  }, []);

  // 그룹 목록 변경 시 활성 ID 유효성 점검·자동 선택
  useEffect(() => {
    if (loading) return;
    if (groups.length === 0) {
      setActiveGroupIdState(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      return;
    }
    const validIds = groups.map((g) => g.id);
    if (!activeGroupId || !validIds.includes(activeGroupId)) {
      const next = groups[0].id;
      setActiveGroupIdState(next);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    }
  }, [groups, loading, activeGroupId]);

  const setActiveGroupId = useCallback((id: string) => {
    setActiveGroupIdState(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;

  return (
    <ActiveGroupContext.Provider
      value={{
        groups,
        activeGroupId,
        activeGroup,
        setActiveGroupId,
        loading,
        error,
      }}
    >
      {children}
    </ActiveGroupContext.Provider>
  );
}
