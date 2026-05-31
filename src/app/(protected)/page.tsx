"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { signOut } from "@/lib/firebase/auth";
import { mapAuthError } from "@/lib/firebase/errors";

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSignOut() {
    setError(null);
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } catch (err) {
      setError(mapAuthError(err));
      setSigningOut(false);
    }
  }

  const displayName = user?.displayName ?? user?.email ?? "사용자";

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">환영합니다</p>
          <h1 className="text-2xl font-bold text-foreground">
            {displayName}님
          </h1>
        </div>
        <button
          onClick={onSignOut}
          disabled={signingOut}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-background disabled:opacity-50"
        >
          {signingOut ? "로그아웃 중…" : "로그아웃"}
        </button>
      </header>

      <section className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
        <h2 className="text-lg font-semibold text-foreground">
          🏠 홈 — 곧 만들 예정
        </h2>
        <p className="mt-2 text-sm text-muted">
          Day 5 이후 그룹 생성·합류 → 홈 카드 그리드 차차 구현됩니다.
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-foreground">
          <li>• 이메일: {user?.email}</li>
          <li>• UID: <code className="font-mono text-xs">{user?.uid}</code></li>
        </ul>
      </section>

      {error && (
        <p className="mt-4 rounded-lg bg-chore-red/10 px-3 py-2 text-sm text-chore-red">
          {error}
        </p>
      )}
    </main>
  );
}
