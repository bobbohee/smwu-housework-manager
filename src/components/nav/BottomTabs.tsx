"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/nav/items";

export function BottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 grid grid-cols-5 border-t border-border bg-surface md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition",
              active ? "text-brand" : "text-muted",
            ].join(" ")}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}
