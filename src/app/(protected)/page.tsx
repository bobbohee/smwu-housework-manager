"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUserDoc } from "@/lib/hooks/useUserDoc";
import { signOut } from "@/lib/firebase/auth";
import { mapAuthError } from "@/lib/firebase/errors";

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { userDoc, loading: userDocLoading } = useUserDoc();
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
  const groupIds = userDoc?.groupIds ?? [];

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

      {userDocLoading ? (
        <p className="text-sm text-muted">불러오는 중…</p>
      ) : groupIds.length === 0 ? (
        <EmptyGroupState />
      ) : (
        <HasGroupState groupCount={groupIds.length} />
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-chore-red/10 px-3 py-2 text-sm text-chore-red">
          {error}
        </p>
      )}
    </main>
  );
}

function EmptyGroupState() {
  return (
    <section className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
      <div className="text-3xl">🏠</div>
      <h2 className="mt-2 text-lg font-semibold text-foreground">
        아직 소속된 그룹이 없습니다
      </h2>
      <p className="mt-1 text-sm text-muted">
        새 그룹을 만들거나, 받은 초대 코드로 합류할 수 있습니다.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/groups/new"
          className="rounded-xl border border-brand bg-brand px-4 py-3 text-center font-semibold text-brand-foreground hover:opacity-90"
        >
          ➕ 그룹 만들기
        </Link>
        <Link
          href="/groups/join"
          className="rounded-xl border border-border bg-surface px-4 py-3 text-center font-semibold text-foreground hover:bg-background"
        >
          🔑 초대 코드로 합류
        </Link>
      </div>
    </section>
  );
}

function HasGroupState({ groupCount }: { groupCount: number }) {
  return (
    <section className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
      <h2 className="text-lg font-semibold text-foreground">
        🏠 소속 그룹 {groupCount}개
      </h2>
      <p className="mt-2 text-sm text-muted">
        Day 6 이후 그룹 카드 그리드 + 그룹 전환 UI 차차 구현 예정.
      </p>
      <div className="mt-4">
        <Link
          href="/groups/join"
          className="text-sm font-medium text-brand hover:underline"
        >
          + 다른 그룹에도 합류하기
        </Link>
      </div>
    </section>
  );
}
