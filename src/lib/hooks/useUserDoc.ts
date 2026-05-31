"use client";

import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { userRef } from "@/lib/firebase/collections";
import type { UserDoc } from "@/lib/types/firestore";
import { useAuth } from "@/lib/hooks/useAuth";

export interface UseUserDocResult {
  userDoc: UserDoc | null;
  loading: boolean;
}

export function useUserDoc(): UseUserDocResult {
  const { user } = useAuth();
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUserDoc(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(userRef(user.uid), (snap) => {
      setUserDoc(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  return { userDoc, loading };
}
