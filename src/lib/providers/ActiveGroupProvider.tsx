"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useGroups } from "@/lib/hooks/useGroups";
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
  const [activeGroupId, setActiveGroupIdState] = useState<string | null>(null);

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
