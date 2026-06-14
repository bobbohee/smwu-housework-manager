"use client";

import { useEffect, useState } from "react";
import { ChoreError, deactivateChoreLog } from "@/lib/chore/operations";
import type { ChoreDoc, ChoreLogDoc, GroupDoc } from "@/lib/types/firestore";
import { useAuth } from "@/lib/hooks/useAuth";
import { mapFirestoreError } from "@/lib/firebase/errors";

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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">
            {formatHumanDate(date)} 완료 상세
          </h2>
          <button
            onClick={onClose}
            className="text-lg text-muted hover:text-foreground"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {logs.length === 0 ? (
          <p className="text-sm text-muted">이 날짜의 완료 기록이 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {logs.map((log) => (
              <LogDetail
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

function formatHumanDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
  return `${y}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")} (${day})`;
}

function LogDetail({
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
    ? new Date(log.completedAt.toMillis()).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const deactTime = log.deactivatedAt?.toMillis?.()
    ? new Date(log.deactivatedAt.toMillis()).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const proxy = log.completedByActual !== log.completedBy;
  const color = chore?.color ?? "#94A3B8";

  return (
    <li className="space-y-2.5">
      <Row label="집안일">
        <span
          className={[
            "inline-flex items-center gap-1.5 font-semibold",
            !log.active && "text-dim line-through",
          ].filter(Boolean).join(" ")}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          <span className={log.active ? "text-foreground" : "text-dim"}>
            {chore?.name ?? "(삭제된 집안일)"}
          </span>
        </span>
      </Row>
      <Row label="담당자(차례)">
        <span className={log.active ? "font-semibold text-foreground" : "font-semibold text-dim"}>
          {nameOf(log.completedBy)}
        </span>
      </Row>
      {proxy && (
        <Row label="실제 완료">
          <span className="font-semibold text-foreground">
            {nameOf(log.completedByActual)}
          </span>
        </Row>
      )}
      <Row label="완료 시간">
        <span className={log.active ? "font-semibold text-foreground" : "font-semibold text-dim"}>
          {time}
        </span>
      </Row>
      <Row label="상태">
        {log.active ? (
          <span className="font-semibold text-chore-green">활성</span>
        ) : (
          <span className="font-semibold text-chore-red">비활성화</span>
        )}
      </Row>
      {!log.active && (
        <>
          <Row label="처리자">
            <span className="font-semibold text-dim">
              {log.deactivatedBy ? nameOf(log.deactivatedBy) : "—"}
            </span>
          </Row>
          {deactTime && (
            <Row label="처리 시간">
              <span className="font-semibold text-dim">{deactTime}</span>
            </Row>
          )}
          <div className="rounded-lg border border-chore-red/25 bg-chore-red/5 px-3 py-2">
            <p className="mb-0.5 text-[11px] font-semibold text-chore-red">
              비활성화 사유
            </p>
            <p className="text-xs text-foreground">
              {log.deactivateReason ?? "(사유 없음)"}
            </p>
          </div>
        </>
      )}

      {isOwner && log.active && user && (
        <DeactivateButton logId={log.id} ownerUid={user.uid} />
      )}
    </li>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span>{children}</span>
    </div>
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
      setError(
        err instanceof ChoreError
          ? err.message
          : mapFirestoreError(err, "비활성화 실패."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-chore-red/40 bg-transparent py-2.5 text-sm font-semibold text-chore-red hover:bg-chore-red/5"
      >
        비활성화
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg bg-surface-2 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        비활성화 사유 (필수)
      </p>
      <textarea
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="예: 음식물쓰레기를 비우지 않음"
        maxLength={200}
        className="input text-sm"
      />
      {error && (
        <p className="text-xs text-chore-red">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setReason("");
            setError(null);
          }}
          className="flex-1 rounded-lg border border-border bg-surface py-2 text-sm font-semibold text-muted"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting || !reason.trim()}
          className="flex-[2] rounded-lg bg-chore-red py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40"
        >
          {submitting ? "처리 중…" : "비활성화"}
        </button>
      </div>
    </div>
  );
}
