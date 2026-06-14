"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveGroup } from "@/lib/hooks/useActiveGroup";
import { useAuth } from "@/lib/hooks/useAuth";
import { signOut } from "@/lib/firebase/auth";
import { mapAuthError } from "@/lib/firebase/errors";
import { GroupSwitcher } from "@/components/group/GroupSwitcher";

export function GroupBar() {
  const router = useRouter();
  const { activeGroup, groups } = useActiveGroup();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const today = formatToday(new Date());
  const displayName = user?.displayName ?? user?.email ?? "사용자";

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
          {user && (
            <button
              onClick={onSignOut}
              disabled={signingOut}
              className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground hover:bg-background disabled:opacity-50"
              title={`${displayName}님 로그아웃`}
            >
              {signingOut ? "…" : "로그아웃"}
            </button>
          )}
        </div>
      </div>

      {signOutError && (
        <p className="border-b border-chore-red/30 bg-chore-red/10 px-4 py-2 text-sm text-chore-red md:px-6">
          {signOutError}
        </p>
      )}

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
