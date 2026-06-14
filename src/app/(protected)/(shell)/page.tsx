"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useActiveGroup } from "@/lib/hooks/useActiveGroup";
import { useChores } from "@/lib/hooks/useChores";
import { signOut } from "@/lib/firebase/auth";
import { mapAuthError, mapFirestoreError } from "@/lib/firebase/errors";
import { GroupBar } from "@/components/group/GroupBar";
import { ChoreError, completeRotation } from "@/lib/chore/operations";
import { dutyUidsForToday } from "@/lib/chore/fixed-schedule";
import type { ChoreDoc, GroupDoc } from "@/lib/types/firestore";

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

      <div className="mx-auto max-w-3xl px-6 py-4 md:px-10 md:py-5">
        {error ? (
          <p className="rounded-lg bg-chore-red/10 px-3 py-2 text-sm text-chore-red">
            {error}
          </p>
        ) : loading ? (
          <p className="text-sm text-muted">불러오는 중…</p>
        ) : groups.length === 0 ? (
          <EmptyGroupState />
        ) : activeGroup ? (
          <ActiveGroupHome group={activeGroup} myUid={user?.uid ?? ""} />
        ) : null}

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

function ActiveGroupHome({
  group,
  myUid,
}: {
  group: GroupDoc;
  myUid: string;
}) {
  const { chores, loading, error } = useChores();

  const rotationChores = useMemo(
    () => chores.filter((c) => c.mode === "rotation"),
    [chores],
  );
  const fixedChores = useMemo(
    () => chores.filter((c) => c.mode === "fixed"),
    [chores],
  );

  if (error) {
    return (
      <p className="rounded-lg bg-chore-red/10 px-3 py-2 text-sm text-chore-red">
        {error}
      </p>
    );
  }
  if (loading) return <p className="text-sm text-muted">집안일 불러오는 중…</p>;

  if (chores.length === 0) {
    return (
      <section className="rounded-2xl bg-surface p-6 text-center shadow-sm ring-1 ring-border">
        <div className="text-3xl">🧹</div>
        <h2 className="mt-2 text-lg font-semibold text-foreground">
          아직 등록된 집안일이 없습니다
        </h2>
        <p className="mt-1 text-sm text-muted">
          집안일을 추가하면 여기에 카드로 표시됩니다.
        </p>
        <Link
          href="/chores"
          className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:opacity-90"
        >
          집안일 관리 ➜
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <FixedDutySection group={group} chores={fixedChores} />
      <RotationSection group={group} chores={rotationChores} myUid={myUid} />
    </div>
  );
}

function memberName(group: GroupDoc, uid: string): string {
  return group.memberNames?.[uid] ?? "익명";
}

function FixedDutySection({
  group,
  chores,
}: {
  group: GroupDoc;
  chores: ChoreDoc[];
}) {
  const today = useMemo(() => new Date(), []);
  const items = chores
    .map((c) => ({
      chore: c,
      dutyUids: dutyUidsForToday(c.fixedSchedule, today),
    }))
    .filter((item) => item.dutyUids.length > 0);

  if (items.length === 0) return null;

  return (
    <section className="rounded-lg border border-chore-green/35 bg-chore-green/10 px-3 py-2.5">
      <p className="text-sm font-bold uppercase tracking-wide text-chore-green">
        오늘의 고정 집안일
      </p>
      <ul className="mt-1.5 space-y-1">
        {items.map(({ chore, dutyUids }) => (
          <li key={chore.id} className="flex items-center gap-2 text-sm">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: chore.color }}
              aria-hidden
            />
            <span className="font-medium text-foreground">{chore.name}</span>
            <span className="text-muted">—</span>
            <span className="font-semibold text-foreground">
              {dutyUids.map((uid) => memberName(group, uid)).join(", ")}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RotationSection({
  group,
  chores,
  myUid,
}: {
  group: GroupDoc;
  chores: ChoreDoc[];
  myUid: string;
}) {
  if (chores.length === 0) {
    return (
      <section className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-border">
        <h2 className="text-sm font-semibold text-muted">🔄 순번 집안일</h2>
        <p className="mt-3 text-sm text-muted">등록된 순번제 집안일이 없습니다.</p>
      </section>
    );
  }

  return (
    <section>
      <p className="text-sm font-bold uppercase tracking-wide text-muted">
        순번제 집안일
      </p>
      <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {chores.map((chore) => (
          <RotationCard
            key={chore.id}
            chore={chore}
            group={group}
            myUid={myUid}
          />
        ))}
      </ul>
    </section>
  );
}

function hexAlpha(hex: string, pct: number): string {
  const a = Math.round((pct / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

function RotationCard({
  chore,
  group,
  myUid,
}: {
  chore: ChoreDoc;
  group: GroupDoc;
  myUid: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMembers = chore.rotationOrder.length > 0;
  const turnUid = hasMembers
    ? chore.rotationOrder[chore.currentTurnIndex] ?? chore.rotationOrder[0]
    : null;
  const isMyTurn = turnUid === myUid;
  const isParticipant = chore.rotationOrder.includes(myUid);
  const canComplete = hasMembers && (isMyTurn || (chore.allowProxyComplete && isParticipant));

  async function onComplete() {
    setError(null);
    setSubmitting(true);
    try {
      await completeRotation({ choreId: chore.id, actualUid: myUid });
    } catch (err) {
      setError(
        err instanceof ChoreError
          ? err.message
          : mapFirestoreError(err, "완료 처리 실패."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li
      className="flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl border p-5 text-center transition"
      style={{
        backgroundColor: hexAlpha(chore.color, 14),
        borderColor: hexAlpha(chore.color, 40),
      }}
    >
      <p
        className="text-base font-bold leading-tight"
        style={{ color: chore.color }}
      >
        {chore.name}
      </p>
      {hasMembers && turnUid ? (
        <p className="text-lg font-bold leading-tight text-foreground">
          {memberName(group, turnUid)}
          {isMyTurn && (
            <span className="ml-1 text-sm font-semibold text-brand">
              (나)
            </span>
          )}
        </p>
      ) : (
        <p className="text-xs text-muted">참여 멤버 미설정</p>
      )}
      <button
        onClick={onComplete}
        disabled={!canComplete || submitting}
        className="mt-1 rounded-md px-4 py-1.5 text-xs font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          backgroundColor: canComplete && !submitting ? chore.color : "#94a3b8",
        }}
      >
        {submitting ? "처리 중…" : "완료"}
      </button>
      {chore.allowProxyComplete && (
        <span className="text-sm text-muted">대신 완료 허용</span>
      )}
      {error && (
        <p className="rounded bg-chore-red/10 px-1.5 py-0.5 text-sm text-chore-red">
          {error}
        </p>
      )}
    </li>
  );
}
