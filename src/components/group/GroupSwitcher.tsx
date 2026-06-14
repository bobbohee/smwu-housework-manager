"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useActiveGroup } from "@/lib/hooks/useActiveGroup";

export function GroupSwitcher({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { groups, activeGroupId, setActiveGroupId } = useActiveGroup();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function pick(id: string) {
    setActiveGroupId(id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-surface p-2 shadow-xl ring-1 ring-border"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="그룹 선택"
      >
        <p className="px-3 py-2 text-xs font-medium text-muted">그룹 선택</p>

        <ul>
          {groups.map((g) => {
            const isCurrent = g.id === activeGroupId;
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => pick(g.id)}
                  className={[
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition",
                    isCurrent
                      ? "bg-brand/10 text-brand"
                      : "text-foreground hover:bg-background",
                  ].join(" ")}
                >
                  <span>{g.name}</span>
                  {isCurrent && (
                    <span className="rounded-md bg-brand px-1.5 py-0.5 text-sm font-semibold text-brand-foreground">
                      현재
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-1 border-t border-border pt-1">
          <Link
            href="/groups/new"
            onClick={onClose}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-background"
          >
            ➕ 새 그룹 만들기
          </Link>
          <Link
            href="/groups/join"
            onClick={onClose}
            className="block rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-background"
          >
            🔑 초대 코드로 합류
          </Link>
        </div>
      </div>
    </div>
  );
}
