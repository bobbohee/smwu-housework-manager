"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useActiveGroup } from "@/lib/hooks/useActiveGroup";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  GroupError,
  kickMember,
  leaveGroup,
  transferOwnership,
  updateGroupName,
} from "@/lib/group/operations";
import { GroupBar } from "@/components/group/GroupBar";
import { mapFirestoreError } from "@/lib/firebase/errors";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeGroup, loading } = useActiveGroup();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  return (
    <>
      <GroupBar />
      <div className="mx-auto max-w-3xl px-6 py-4 md:px-10 md:py-5">
        <h1 className="mb-6 flex items-center gap-2 text-lg font-bold text-foreground">
          <span>⚙️</span>
          <span>설정</span>
        </h1>

        {loading ? (
          <p className="text-sm text-muted">불러오는 중…</p>
        ) : !activeGroup ? (
          <p className="text-sm text-muted">활성 그룹이 없습니다.</p>
        ) : (
          <div className="space-y-5">
            <NameSection
              groupId={activeGroup.id}
              name={activeGroup.name}
              setError={setError}
              busy={busy}
              setBusy={setBusy}
            />

            <InviteCodeSection code={activeGroup.inviteCode} />

            <MemberSection
              memberUids={activeGroup.memberUids}
              memberNames={activeGroup.memberNames}
              ownerId={activeGroup.ownerId}
              myUid={user.uid}
              myDisplayName={user.displayName ?? user.email ?? "나"}
              groupId={activeGroup.id}
              setError={setError}
              busy={busy}
              setBusy={setBusy}
            />

            <Link
              href="/chores"
              className="flex items-center justify-between rounded-2xl bg-surface px-5 py-4 shadow-sm ring-1 ring-border transition hover:bg-background"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span>📋</span>
                <span>집안일 관리</span>
              </span>
              <span className="text-muted">›</span>
            </Link>

            <LeaveSection
              groupId={activeGroup.id}
              myUid={user.uid}
              isOwner={activeGroup.ownerId === user.uid}
              onLeft={() => router.replace("/")}
              setError={setError}
              busy={busy}
              setBusy={setBusy}
            />

            {error && (
              <p className="rounded-lg bg-chore-red/10 px-3 py-2 text-sm text-chore-red">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-surface p-5 shadow-sm ring-1 ring-border">
      <h2 className="mb-3 text-sm font-semibold text-muted">{title}</h2>
      {children}
    </section>
  );
}

function NameSection({
  groupId,
  name,
  setError,
  busy,
  setBusy,
}: {
  groupId: string;
  name: string;
  setError: (s: string | null) => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      await updateGroupName(groupId, draft);
      setEditing(false);
    } catch (err) {
      setError(
        err instanceof GroupError
          ? err.message
          : mapFirestoreError(err, "이름 변경 실패."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="그룹 이름">
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={20}
            className="input"
            autoFocus
          />
          <button
            onClick={save}
            disabled={busy}
            className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-brand-foreground disabled:opacity-50"
          >
            저장
          </button>
          <button
            onClick={() => {
              setDraft(name);
              setEditing(false);
              setError(null);
            }}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground"
          >
            취소
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-foreground">{name}</p>
          <button
            onClick={() => {
              setDraft(name);
              setEditing(true);
            }}
            className="rounded-md border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-background"
          >
            수정
          </button>
        </div>
      )}
    </Card>
  );
}

function InviteCodeSection({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({
        title: "우리집 살림 매니저 초대",
        text: `초대 코드: ${code}`,
      });
    } else {
      await copy();
    }
  }

  return (
    <Card title="초대 코드">
      <div className="flex items-center justify-between">
        <span className="font-mono text-2xl font-bold tracking-widest text-brand">
          {code}
        </span>
        <div className="flex gap-2">
          <button
            onClick={copy}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background"
          >
            {copied ? "복사됨" : "복사"}
          </button>
          <button
            onClick={share}
            className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:opacity-90"
          >
            공유
          </button>
        </div>
      </div>
    </Card>
  );
}

function MemberSection({
  memberUids,
  memberNames,
  ownerId,
  myUid,
  myDisplayName,
  groupId,
  setError,
  busy,
  setBusy,
}: {
  memberUids: string[];
  memberNames: Record<string, string>;
  ownerId: string;
  myUid: string;
  myDisplayName: string;
  groupId: string;
  setError: (s: string | null) => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
}) {
  const isOwner = ownerId === myUid;

  async function onTransfer(toUid: string) {
    if (!confirm("이 멤버에게 방장 권한을 위임할까요? 본인은 일반 멤버가 됩니다.")) return;
    setError(null);
    setBusy(true);
    try {
      await transferOwnership(groupId, toUid);
    } catch (err) {
      setError(
        err instanceof GroupError
          ? err.message
          : mapFirestoreError(err, "방장 위임 실패."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function onKick(targetUid: string) {
    if (!confirm("이 멤버를 강퇴할까요? 완료 기록은 보존됩니다.")) return;
    setError(null);
    setBusy(true);
    try {
      await kickMember(groupId, targetUid, myUid);
    } catch (err) {
      setError(
        err instanceof GroupError
          ? err.message
          : mapFirestoreError(err, "강퇴 실패."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={`멤버 (${memberUids.length}명)`}>
      <ul className="divide-y divide-border">
        {memberUids.map((uid) => {
          const isMe = uid === myUid;
          const isMemberOwner = uid === ownerId;
          const label = isMe
            ? myDisplayName
            : (memberNames[uid] ?? `멤버 (${uid.slice(0, 4)})`);
          return (
            <li
              key={uid}
              className="flex items-center justify-between py-2.5"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-sm">
                  {isMemberOwner ? "👑" : "👤"}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {label} {isMe && <span className="text-xs text-muted">(나)</span>}
                  </p>
                  <p className="text-sm text-muted">
                    {isMemberOwner ? "방장" : "멤버"}
                  </p>
                </div>
              </div>

              {isOwner && !isMe && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onTransfer(uid)}
                    disabled={busy}
                    className="rounded-md border border-border bg-surface px-2.5 py-1 text-sm font-medium text-foreground hover:bg-background disabled:opacity-50"
                  >
                    방장 위임
                  </button>
                  <button
                    onClick={() => onKick(uid)}
                    disabled={busy}
                    className="rounded-md border border-chore-red bg-chore-red/10 px-2.5 py-1 text-sm font-medium text-chore-red hover:bg-chore-red/20 disabled:opacity-50"
                  >
                    강퇴
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function LeaveSection({
  groupId,
  myUid,
  isOwner,
  onLeft,
  setError,
  busy,
  setBusy,
}: {
  groupId: string;
  myUid: string;
  isOwner: boolean;
  onLeft: () => void;
  setError: (s: string | null) => void;
  busy: boolean;
  setBusy: (b: boolean) => void;
}) {
  async function onLeave() {
    if (isOwner) {
      setError("방장은 다른 멤버에게 위임 후 나갈 수 있습니다.");
      return;
    }
    if (!confirm("그룹을 나갈까요? 본인의 완료 기록은 보존됩니다.")) return;
    setError(null);
    setBusy(true);
    try {
      await leaveGroup(groupId, myUid, isOwner);
      onLeft();
    } catch (err) {
      setError(
        err instanceof GroupError
          ? err.message
          : mapFirestoreError(err, "탈퇴 실패."),
      );
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onLeave}
      disabled={busy || isOwner}
      className="w-full rounded-xl border border-chore-red bg-surface py-2.5 text-sm font-semibold text-chore-red hover:bg-chore-red/5 disabled:opacity-50"
      title={isOwner ? "방장은 위임 후 나갈 수 있습니다" : undefined}
    >
      그룹 나가기
    </button>
  );
}
