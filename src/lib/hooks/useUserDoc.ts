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
  const { user, loading: authLoading } = useAuth();
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  const loading = authLoading || (!!user && !subscribed);

  useEffect(() => {
    if (authLoading || !user) return undefined;

    const ref = userRef(user.uid);
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (snap.exists()) {
          setUserDoc(snap.data());
          setError(null);
          setSubscribed(true);
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
          // setDoc 성공하면 onSnapshot이 새 데이터로 다시 fire → 다음 콜백이 subscribed 처리
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setError(`사용자 문서 생성 실패: ${msg}`);
          setSubscribed(true);
        }
      },
      (err) => {
        setError(`Firestore 구독 실패: ${err.code} — ${err.message}`);
        setSubscribed(true);
      },
    );
    return () => {
      unsub();
      setSubscribed(false);
      setUserDoc(null);
    };
  }, [user, authLoading]);

  return { userDoc, loading, error };
}
