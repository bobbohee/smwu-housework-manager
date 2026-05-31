"use client";

import { useEffect, useState } from "react";
import { onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { userRef } from "@/lib/firebase/collections";
import type { UserDoc } from "@/lib/types/firestore";
import { useAuth } from "@/lib/hooks/useAuth";

export interface UseUserDocResult {
  userDoc: UserDoc | null;
  loading: boolean;
  error: string | null;
}

export function useUserDoc(): UseUserDocResult {
  const { user } = useAuth();
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setUserDoc(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);

    const ref = userRef(user.uid);
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (snap.exists()) {
          setUserDoc(snap.data());
          setLoading(false);
          return;
        }
        // 가입 시 setDoc이 race로 빠졌거나 외부에서 삭제된 경우 자가 치유.
        try {
          await setDoc(ref, {
            uid: user.uid,
            name: user.displayName ?? user.email ?? "",
            email: user.email ?? "",
            groupIds: [],
            createdAt: serverTimestamp(),
          });
          // setDoc 성공하면 onSnapshot이 새 데이터로 다시 fire하므로 loading 유지
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(`사용자 문서 생성 실패: ${msg}`);
          setLoading(false);
        }
      },
      (err) => {
        setError(`Firestore 구독 실패: ${err.code} — ${err.message}`);
        setLoading(false);
      },
    );
    return unsub;
  }, [user]);

  return { userDoc, loading, error };
}
