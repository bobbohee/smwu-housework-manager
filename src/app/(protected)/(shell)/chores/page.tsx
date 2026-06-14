"use client";

import Link from "next/link";
import { useState } from "react";
import { GroupBar } from "@/components/group/GroupBar";
import { useActiveGroup } from "@/lib/hooks/useActiveGroup";
import { useChores } from "@/lib/hooks/useChores";
import { ChoreError, deleteChore } from "@/lib/chore/operations";
import { mapFirestoreError } from "@/lib/firebase/errors";
import type { ChoreDoc } from "@/lib/types/firestore";

export default function ChoresPage() {
  const { activeGroup, loading: groupLoading } = useActiveGroup();
  const { chores, loading, error } = useChores();

  return (
    <>
      <GroupBar />
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-bold text-foreground">집안일 관리</h1>
          {activeGroup && (
            <Link href="/chores/new" className="btn btn-primary btn-sm">
              + 추가
            </Link>
          )}
        </div>

        {groupLoading || loading ? (
          <p className="mt-6 text-sm text-muted">불러오는 중…</p>
        ) : !activeGroup ? (
          <p className="mt-6 text-sm text-muted">활성 그룹이 없습니다.</p>
        ) : error ? (
          <p className="mt-6 rounded-lg bg-chore-red/10 px-3 py-2 text-sm text-chore-red">
            {error}
          </p>
        ) : chores.length === 0 ? (
          <EmptyState />
        ) : (
          <ChoreList chores={chores} />
        )}
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <section className="mt-6 rounded-2xl bg-surface p-6 text-center shadow-sm ring-1 ring-border">
      <div className="text-3xl">🧹</div>
      <p className="mt-2 text-sm text-foreground">아직 등록된 집안일이 없습니다.</p>
      <p className="mt-1 text-xs text-muted">
        오른쪽 상단 &quot;+ 추가&quot;로 첫 집안일을 등록해보세요.
      </p>
    </section>
  );
}

function ChoreList({ chores }: { chores: ChoreDoc[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {chores.map((chore) => (
        <ChoreRow key={chore.id} chore={chore} />
      ))}
    </ul>
  );
}

function hexAlpha(hex: string, pct: number): string {
  const a = Math.round((pct / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

function ChoreRow({ chore }: { chore: ChoreDoc }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`"${chore.name}"을(를) 삭제할까요? 기존 완료 기록은 보존됩니다.`)) {
      return;
    }
    setError(null);
    setDeleting(true);
    try {
      await deleteChore(chore.id);
    } catch (err) {
      setError(
        err instanceof ChoreError
          ? err.message
          : mapFirestoreError(err, "삭제 실패."),
      );
      setDeleting(false);
    }
  }

  return (
    <li
      className="flex items-center gap-3 rounded-xl border px-3 py-3 shadow-sm transition hover:shadow-md"
      style={{
        backgroundColor: hexAlpha(chore.color, 22),
        borderColor: hexAlpha(chore.color, 70),
      }}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: chore.color }}
        aria-hidden
      />
      <Link href={`/chores/${chore.id}`} className="flex-1 min-w-0">
        <p className="truncate text-sm font-bold text-foreground">{chore.name}</p>
        <p className="mt-0.5 text-[11px] text-muted">
          {chore.mode === "rotation"
            ? `순번제 · 참여 ${chore.rotationOrder.length}명`
            : `고정제 · 스케줄 ${chore.fixedSchedule.length}건`}
          {chore.allowProxyComplete && " · 대신 완료 허용"}
        </p>
      </Link>

      <button
        onClick={onDelete}
        disabled={deleting}
        className="btn btn-secondary btn-sm hover:text-chore-red"
        title="삭제"
      >
        {deleting ? "…" : "삭제"}
      </button>
      <Link
        href={`/chores/${chore.id}`}
        className="text-muted hover:text-foreground"
        aria-label="편집"
      >
        ›
      </Link>

      {error && (
        <p className="ml-2 text-xs text-chore-red">{error}</p>
      )}
    </li>
  );
}
