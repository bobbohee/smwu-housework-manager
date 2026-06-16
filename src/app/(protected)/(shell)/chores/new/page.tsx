"use client";

import { GroupBar } from "@/components/group/GroupBar";
import { ChoreForm } from "@/components/chore/ChoreForm";
import { useActiveGroup } from "@/lib/hooks/useActiveGroup";

export default function NewChorePage() {
  const { activeGroup, loading } = useActiveGroup();

  return (
    <>
      <GroupBar />
      <div className="mx-auto max-w-3xl px-6 py-7 md:px-10 md:py-9">
        <h1 className="text-lg font-bold text-foreground">집안일 추가</h1>
        <div className="mt-8">
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
