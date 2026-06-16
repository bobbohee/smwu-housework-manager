"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { GroupBar } from "@/components/group/GroupBar";
import { ChoreForm } from "@/components/chore/ChoreForm";
import { useActiveGroup } from "@/lib/hooks/useActiveGroup";
import { useChores } from "@/lib/hooks/useChores";
import { ChoreError, deleteChore } from "@/lib/chore/operations";
import { mapFirestoreError } from "@/lib/firebase/errors";
import type { ChoreDoc } from "@/lib/types/firestore";

export default function EditChorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { activeGroup, loading: groupLoading } = useActiveGroup();
  const { chores, loading: choresLoading } = useChores();

  const chore = chores.find((c) => c.id === id);

  return (
    <>
      <GroupBar />
      <div className="mx-auto max-w-3xl px-6 py-7 md:px-10 md:py-9">
        <h1 className="text-lg font-bold text-foreground">집안일 편집</h1>
        <div className="mt-8">
          {groupLoading || choresLoading ? (
            <p className="text-sm text-muted">불러오는 중…</p>
          ) : !activeGroup ? (
            <p className="text-sm text-muted">활성 그룹이 없습니다.</p>
          ) : !chore ? (
            <p className="text-sm text-muted">
              집안일을 찾을 수 없습니다. 다른 그룹의 집안일이거나 삭제되었을 수
              있습니다.
            </p>
          ) : (
            <>
              <ChoreForm group={activeGroup} initial={chore} />
              <DangerZone chore={chore} />
            </>
          )}
        </div>
      </div>
    </>
  );
}

function DangerZone({ chore }: { chore: ChoreDoc }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (
      !confirm(
        `"${chore.name}"을(를) 삭제할까요? 기존 완료 기록은 보존됩니다.`,
      )
    ) {
      return;
    }
    setError(null);
    setDeleting(true);
    try {
      await deleteChore(chore.id);
      router.push("/chores");
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
    <section className="mt-10 rounded-2xl border border-chore-red/30 bg-chore-red/5 p-5">
      <h2 className="text-sm font-bold text-chore-red">위험 영역</h2>
      <p className="mt-1 text-xs text-muted">
        집안일을 삭제합니다. 완료 기록은 보존되지만 새 완료는 불가능합니다.
      </p>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="mt-3 rounded-lg border border-chore-red bg-surface px-4 py-2 text-sm font-semibold text-chore-red hover:bg-chore-red/10 disabled:opacity-50"
      >
        {deleting ? "삭제 중…" : "집안일 삭제"}
      </button>
      {error && (
        <p className="mt-2 text-xs text-chore-red">{error}</p>
      )}
    </section>
  );
}
