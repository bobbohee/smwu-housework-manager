"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUserDoc } from "@/lib/hooks/useUserDoc";
import { GroupError, createGroup } from "@/lib/group/operations";
import { CHORE_PRESETS, createChoresFromPresets } from "@/lib/chore/presets";
import { mapFirestoreError } from "@/lib/firebase/errors";

export default function NewGroupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { userDoc } = useUserDoc();
  const [name, setName] = useState("");
  // 기본: 전체 선택 (사용자가 빠르게 시작 가능, 원치 않으면 해제)
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(
    () => new Set(CHORE_PRESETS.map((p) => p.slug)),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    groupId: string;
    code: string;
    presetCount: number;
  } | null>(null);

  function toggleSlug(slug: string) {
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }
  function toggleAll() {
    if (selectedSlugs.size === CHORE_PRESETS.length) {
      setSelectedSlugs(new Set());
    } else {
      setSelectedSlugs(new Set(CHORE_PRESETS.map((p) => p.slug)));
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !userDoc) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await createGroup(name, user.uid, userDoc.name);
      const slugs = Array.from(selectedSlugs);
      // 프리셋 생성은 group 생성 후 별도 batch. 실패 시 그룹은 보존 (chores 비어있음).
      let presetCount = 0;
      if (slugs.length > 0) {
        const ids = await createChoresFromPresets(result.groupId, slugs);
        presetCount = ids.length;
      }
      setSuccess({
        groupId: result.groupId,
        code: result.inviteCode,
        presetCount,
      });
    } catch (err) {
      setError(
        err instanceof GroupError
          ? err.message
          : mapFirestoreError(err, "그룹 생성 실패."),
      );
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
            {success.presetCount > 0 && (
              <>
                <br />
                기본 집안일 {success.presetCount}개가 추가되었습니다 — 참여
                멤버와 스케줄은 &quot;집안일 관리&quot;에서 채워주세요.
              </>
            )}
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

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                기본 집안일 추가
              </span>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-muted hover:text-brand"
              >
                {selectedSlugs.size === CHORE_PRESETS.length
                  ? "전체 해제"
                  : "전체 선택"}
              </button>
            </div>
            <p className="mb-2 text-xs text-muted">
              그룹 생성 후 자유롭게 추가·수정·삭제할 수 있습니다.
            </p>
            <ul className="space-y-1">
              {CHORE_PRESETS.map((preset) => {
                const checked = selectedSlugs.has(preset.slug);
                return (
                  <li key={preset.slug}>
                    <label
                      className={[
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition cursor-pointer",
                        checked
                          ? "border-brand bg-brand/5"
                          : "border-border bg-background hover:bg-surface",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSlug(preset.slug)}
                        className="h-4 w-4"
                      />
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: preset.defaultColor }}
                        aria-hidden
                      />
                      <span className="flex-1 text-foreground">{preset.name}</span>
                      <span className="text-xs text-muted">
                        {preset.mode === "rotation" ? "순번제" : "고정제"}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

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
