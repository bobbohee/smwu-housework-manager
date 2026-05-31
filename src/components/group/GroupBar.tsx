"use client";

import { useState } from "react";
import { useActiveGroup } from "@/lib/hooks/useActiveGroup";
import { GroupSwitcher } from "@/components/group/GroupSwitcher";

export function GroupBar({ right }: { right?: React.ReactNode }) {
  const { activeGroup, groups } = useActiveGroup();
  const [open, setOpen] = useState(false);

  const today = formatToday(new Date());

  return (
    <>
      <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:px-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={groups.length === 0}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-base font-bold text-foreground transition hover:bg-background disabled:opacity-50"
        >
          <span>{activeGroup?.name ?? "그룹 없음"}</span>
          {groups.length > 0 && (
            <span className="text-xs text-muted">▾</span>
          )}
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">{today}</span>
          {right}
        </div>
      </div>

      <GroupSwitcher open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function formatToday(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${yyyy}.${mm}.${dd} (${weekday})`;
}
