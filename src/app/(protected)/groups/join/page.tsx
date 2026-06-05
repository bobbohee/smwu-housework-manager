"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUserDoc } from "@/lib/hooks/useUserDoc";
import { GroupError, joinGroup } from "@/lib/group/operations";

export default function JoinGroupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { userDoc } = useUserDoc();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !userDoc) return;
    setError(null);
    setSubmitting(true);
    try {
      await joinGroup(code, user.uid, userDoc.name);
      router.replace("/");
    } catch (err) {
      setError(err instanceof GroupError ? err.message : "합류 실패.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
        <h1 className="text-xl font-bold text-foreground">그룹 합류</h1>
        <p className="mt-1 text-sm text-muted">
          방장에게 받은 6자 초대 코드를 입력해주세요.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              초대 코드
            </span>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="예: ABCD23"
              maxLength={6}
              autoCapitalize="characters"
              spellCheck={false}
              className="input font-mono tracking-widest"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-chore-red/10 px-3 py-2 text-sm text-chore-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand py-2.5 font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "합류 중…" : "합류하기"}
          </button>

          <p className="text-center text-sm text-muted">
            <Link href="/" className="hover:underline">
              취소
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
