import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
