"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { GroupError, createGroup } from "@/lib/group/operations";

export default function NewGroupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    groupId: string;
    code: string;
  } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await createGroup(name, user.uid);
      setSuccess({ groupId: result.groupId, code: result.inviteCode });
    } catch (err) {
      setError(err instanceof GroupError ? err.message : "그룹 생성 실패.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCode() {
    if (!success) return;
    await navigator.clipboard.writeText(success.code);
  }

  if (success) {
    return (
      <main className="mx-auto max-w-md px-6 py-12">
        <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
          <div className="mb-4 text-3xl">🎉</div>
          <h1 className="text-xl font-bold text-foreground">
            그룹이 생성되었습니다
          </h1>
          <p className="mt-1 text-sm text-muted">
            아래 초대 코드를 함께 살 사람에게 공유해주세요.
          </p>

          <div className="mt-6 rounded-xl bg-background p-4">
            <p className="text-xs font-medium text-muted">초대 코드</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-mono text-2xl font-bold tracking-widest text-brand">
                {success.code}
              </span>
              <button
                onClick={copyCode}
                className="rounded-md border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-background"
              >
                복사
              </button>
            </div>
          </div>

          <button
            onClick={() => router.replace("/")}
            className="mt-6 w-full rounded-lg bg-brand py-2.5 font-semibold text-brand-foreground hover:opacity-90"
          >
            홈으로
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border">
        <h1 className="text-xl font-bold text-foreground">그룹 만들기</h1>
        <p className="mt-1 text-sm text-muted">
          함께 사는 사람들과 사용할 그룹의 이름을 정해주세요.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              그룹 이름
            </span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 우리집, 자취방, 1303호"
              maxLength={20}
              className="input"
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
            {submitting ? "생성 중…" : "그룹 만들기"}
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
