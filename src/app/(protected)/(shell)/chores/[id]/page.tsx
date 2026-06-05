"use client";

import { use } from "react";
import { GroupBar } from "@/components/group/GroupBar";
import { ChoreForm } from "@/components/chore/ChoreForm";
import { useActiveGroup } from "@/lib/hooks/useActiveGroup";
import { useChores } from "@/lib/hooks/useChores";

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
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
        <h1 className="text-lg font-bold text-foreground">집안일 편집</h1>
        <div className="mt-6">
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
            <ChoreForm group={activeGroup} initial={chore} />
          )}
        </div>
      </div>
    </>
  );
}
