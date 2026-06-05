"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
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

function readStoredId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function ActiveGroupProvider({ children }: { children: ReactNode }) {
  const { groups, loading, error } = useGroups();
  const { userDoc } = useUserDoc();

  // 사용자 명시 선택값 또는 localStorage 초기값. lazy init으로 effect 없이 hydrate.
  const [userSelectedId, setUserSelectedId] = useState<string | null>(() =>
    readStoredId(),
  );

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

  // 활성 ID는 derived. 사용자 선택값이 유효하면 그대로, 아니면 첫 그룹으로 fallback.
  // groups 변경 시 setState 없이 자연스럽게 재계산.
  const activeGroupId = useMemo<string | null>(() => {
    if (loading || groups.length === 0) return null;
    if (userSelectedId && groups.some((g) => g.id === userSelectedId)) {
      return userSelectedId;
    }
    return groups[0].id;
  }, [groups, loading, userSelectedId]);

  // localStorage는 외부 시스템 → effect로 동기화 (활성 ID 변경 시).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeGroupId) {
      window.localStorage.setItem(STORAGE_KEY, activeGroupId);
    } else if (!loading && groups.length === 0) {
      // 로딩 중에는 stored 값 보존(다른 탭에서 그룹 추가 후 복귀 케이스).
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeGroupId, loading, groups.length]);

  const setActiveGroupId = useCallback((id: string) => {
    setUserSelectedId(id);
  }, []);

  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) ?? null,
    [groups, activeGroupId],
  );

  const value = useMemo<ActiveGroupContextValue>(
    () => ({
      groups,
      activeGroupId,
      activeGroup,
      setActiveGroupId,
      loading,
      error,
    }),
    [groups, activeGroupId, activeGroup, setActiveGroupId, loading, error],
  );

  return (
    <ActiveGroupContext.Provider value={value}>
      {children}
    </ActiveGroupContext.Provider>
  );
}
