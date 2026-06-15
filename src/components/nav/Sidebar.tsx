"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_ITEMS } from "@/components/nav/items";
import { useActiveGroup } from "@/lib/hooks/useActiveGroup";
import { useAuth } from "@/lib/hooks/useAuth";
import { signOut } from "@/lib/firebase/auth";
import { mapAuthError } from "@/lib/firebase/errors";
import { GroupSwitcher } from "@/components/group/GroupSwitcher";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { activeGroup, groups } = useActiveGroup();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

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
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-background md:flex">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={groups.length === 0}
          className="flex items-center gap-2 border-b border-border px-6 py-6 text-left transition hover:bg-surface disabled:opacity-50"
        >
          <span className="flex-1 truncate text-base font-bold text-foreground">
            {activeGroup?.name ?? "그룹 없음"}
          </span>
          {groups.length > 0 && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 shrink-0 text-muted"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        <nav className="flex-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-brand/10 text-brand"
                    : "text-foreground hover:bg-background",
                ].join(" ")}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="border-t border-border px-3 py-3">
            <p className="mb-2 truncate px-2 text-xs text-muted" title={displayName}>
              {displayName}
            </p>
            <button
              type="button"
              onClick={onSignOut}
              disabled={signingOut}
              className="w-full rounded-lg border border-chore-red bg-transparent px-3 py-2 text-sm font-medium text-chore-red transition hover:bg-chore-red hover:text-white disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-chore-red"
            >
              {signingOut ? "로그아웃 중…" : "로그아웃"}
            </button>
            {signOutError && (
              <p className="mt-2 text-xs text-chore-red">{signOutError}</p>
            )}
          </div>
        )}
      </aside>

      <GroupSwitcher open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}
