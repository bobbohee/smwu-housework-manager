"use client";

import { useEffect, useState } from "react";
import {
  ChoreError,
  deactivateChoreLog,
} from "@/lib/chore/operations";
import type { ChoreDoc, ChoreLogDoc, GroupDoc } from "@/lib/types/firestore";
import { useAuth } from "@/lib/hooks/useAuth";

export interface LogDetailDialogProps {
  date: string; // YYYY-MM-DD
  logs: ChoreLogDoc[];
  choreById: Map<string, ChoreDoc>;
  group: GroupDoc;
  onClose: () => void;
}

export function LogDetailDialog({
  date,
  logs,
  choreById,
  group,
  onClose,
}: LogDetailDialogProps) {
  // ESC 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">{date}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted hover:bg-background"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {logs.length === 0 ? (
          <p className="mt-4 text-sm text-muted">이 날짜의 완료 기록이 없습니다.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {logs.map((log) => (
              <LogRow
                key={log.id}
                log={log}
                chore={choreById.get(log.choreId)}
                group={group}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LogRow({
  log,
  chore,
  group,
}: {
  log: ChoreLogDoc;
  chore: ChoreDoc | undefined;
  group: GroupDoc;
}) {
  const { user } = useAuth();
  const isOwner = user?.uid === group.ownerId;

  const nameOf = (uid: string) => group.memberNames?.[uid] ?? uid.slice(0, 6);
  const time = log.completedAt?.toMillis?.()
    ? new Date(log.completedAt.toMillis()).toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const proxyHint =
    log.completedByActual !== log.completedBy
      ? ` (실제: ${nameOf(log.completedByActual)})`
      : "";
  const typeBadge =
    log.type === "random" ? "🎲 꽝뽑기" : "🔄 순번";

  return (
    <li
      className={[
        "rounded-lg bg-background p-3",
        !log.active && "opacity-60 ring-1 ring-dashed ring-muted",
      ].filter(Boolean).join(" ")}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: chore?.color ?? "#95A5A6" }}
          aria-hidden
        />
        <span className="text-sm font-semibold text-foreground">
          {chore?.name ?? "(삭제된 집안일)"}
        </span>
        <span className="ml-auto text-[10px] text-muted">{typeBadge}</span>
      </div>
      <p className="mt-1 text-xs text-muted">
        {nameOf(log.completedBy)}
        {proxyHint} · {time}
      </p>

      {!log.active && (
        <p className="mt-1 rounded bg-chore-red/10 px-2 py-1 text-[11px] text-chore-red">
          비활성화됨 — {log.deactivateReason ?? "사유 없음"}
          {log.deactivatedBy &&
            ` (by ${nameOf(log.deactivatedBy)})`}
        </p>
      )}

      {isOwner && log.active && user && (
        <DeactivateButton logId={log.id} ownerUid={user.uid} />
      )}
    </li>
  );
}

function DeactivateButton({ logId, ownerUid }: { logId: string; ownerUid: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    setError(null);
    setSubmitting(true);
    try {
      await deactivateChoreLog({ logId, ownerUid, reason });
      setOpen(false);
      setReason("");
    } catch (err) {
      setError(err instanceof ChoreError ? err.message : "비활성화 실패.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-muted hover:text-chore-red"
      >
        비활성화…
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-md bg-surface p-2">
      <textarea
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="비활성화 사유 (필수)"
        maxLength={200}
        className="input text-xs"
      />
      {error && (
        <p className="text-[11px] text-chore-red">{error}</p>
      )}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting || !reason.trim()}
          className="flex-1 rounded-md bg-chore-red px-2 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
        >
          {submitting ? "처리 중…" : "비활성화"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setReason("");
            setError(null);
          }}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
        >
          취소
        </button>
      </div>
    </div>
  );
}
