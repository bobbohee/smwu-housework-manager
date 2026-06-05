"use client";

import { GroupBar } from "@/components/group/GroupBar";
import { ChoreForm } from "@/components/chore/ChoreForm";
import { useActiveGroup } from "@/lib/hooks/useActiveGroup";

export default function NewChorePage() {
  const { activeGroup, loading } = useActiveGroup();

  return (
    <>
      <GroupBar />
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
        <h1 className="text-lg font-bold text-foreground">집안일 추가</h1>
        <div className="mt-6">
          {loading ? (
            <p className="text-sm text-muted">불러오는 중…</p>
          ) : !activeGroup ? (
            <p className="text-sm text-muted">활성 그룹이 없습니다.</p>
          ) : (
            <ChoreForm group={activeGroup} />
          )}
        </div>
      </div>
    </>
  );
}
