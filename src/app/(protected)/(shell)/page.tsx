"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useActiveGroup } from "@/lib/hooks/useActiveGroup";
import { signOut } from "@/lib/firebase/auth";
import { mapAuthError } from "@/lib/firebase/errors";
import { GroupBar } from "@/components/group/GroupBar";

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { groups, activeGroup, loading, error } = useActiveGroup();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function onSignOut() {
    setSignOutError(null);
    setSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } catch (err) {
      setSignOutError(mapAuthError(err));
      setSigningOut(false);
    }
  }

  const displayName = user?.displayName ?? user?.email ?? "사용자";

  return (
    <>
      <GroupBar
        right={
          <button
            onClick={onSignOut}
            disabled={signingOut}
            className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-background disabled:opacity-50"
            title={`${displayName}님 로그아웃`}
          >
            {signingOut ? "…" : "로그아웃"}
          </button>
        }
      />

      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
        {error ? (
          <p className="rounded-lg bg-chore-red/10 px-3 py-2 text-sm text-chore-red">
            {error}
          </p>
        ) : loading ? (
          <p className="text-sm text-muted">불러오는 중…</p>
        ) : groups.length === 0 ? (
          <EmptyGroupState />
        ) : (
          <ActiveGroupHome groupName={activeGroup?.name ?? ""} />
        )}

        {signOutError && (
          <p className="mt-4 rounded-lg bg-chore-red/10 px-3 py-2 text-sm text-chore-red">
            {signOutError}
          </p>
        )}
      </div>
    </>
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

function ActiveGroupHome({ groupName }: { groupName: string }) {
  return (
    <section className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
      <h2 className="text-base font-semibold text-foreground">
        🏠 {groupName} 홈
      </h2>
      <p className="mt-2 text-sm text-muted">
        Day 7 이후 집안일 카드 그리드 + 오늘의 고정 집안일 알림 + 완료 버튼이
        여기에 표시됩니다.
      </p>
    </section>
  );
}
