"use client";

import { useState } from "react";
import { GroupBar } from "@/components/group/GroupBar";
import { useActiveGroup } from "@/lib/hooks/useActiveGroup";
import { drawWinners } from "@/lib/chore/random";
import { RandomResultCard } from "@/components/random/RandomResultCard";
import type { GroupDoc } from "@/lib/types/firestore";

export default function RandomPage() {
  const { activeGroup, loading } = useActiveGroup();

  return (
    <>
      <GroupBar />
      <div className="mx-auto max-w-3xl px-6 py-4 md:px-10 md:py-5">
        {loading ? (
          <p className="mt-6 text-sm text-muted">불러오는 중…</p>
        ) : !activeGroup ? (
          <p className="mt-6 text-sm text-muted">활성 그룹이 없습니다.</p>
        ) : (
          <RandomDraw key={activeGroup.id} group={activeGroup} />
        )}
      </div>
    </>
  );
}

type Phase = "setup" | "result";

function RandomDraw({ group }: { group: GroupDoc }) {
  const [selectedUids, setSelectedUids] = useState<Set<string>>(
    () => new Set(group.memberUids),
  );
  const [winnerCount, setWinnerCount] = useState(1);
  const [phase, setPhase] = useState<Phase>("setup");
  const [winners, setWinners] = useState<string[]>([]);

  const selectedCount = selectedUids.size;
  const maxWinners = Math.max(0, selectedCount - 1);
  const clampedCount = Math.min(Math.max(1, winnerCount), Math.max(1, maxWinners));
  const canDraw = maxWinners >= 1;

  function toggleMember(uid: string) {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  function adjustCount(delta: number) {
    setWinnerCount((c) => {
      const next = c + delta;
      if (next < 1) return 1;
      if (next > maxWinners) return Math.max(1, maxWinners);
      return next;
    });
  }

  function onDraw() {
    const picks = drawWinners(Array.from(selectedUids), clampedCount);
    setWinners(picks);
    setPhase("result");
  }

  function onReset() {
    setWinners([]);
    setPhase("setup");
  }

  if (phase === "result") {
    return (
      <RandomResultCard
        allUids={Array.from(selectedUids)}
        winners={winners}
        memberNames={group.memberNames}
        onReset={onReset}
      />
    );
  }

  return (
    <div className="mt-8 space-y-10">
      <section>
        <p className="mb-3 text-xs font-semibold text-muted">참여 멤버</p>
        <ul className="overflow-hidden rounded-lg border border-border bg-surface">
          {group.memberUids.map((uid) => {
            const checked = selectedUids.has(uid);
            const name = group.memberNames[uid] ?? uid.slice(0, 4);
            return (
              <li
                key={uid}
                className="border-b border-border last:border-b-0"
              >
                <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMember(uid)}
                    className="accent-brand"
                  />
                  <span className="text-sm text-foreground">{name}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <p className="mb-3 text-xs font-semibold text-muted">당첨 인원</p>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => adjustCount(-1)}
            disabled={clampedCount <= 1}
            className="h-9 w-9 rounded-lg border border-border bg-surface text-lg font-bold text-foreground hover:bg-background disabled:opacity-30"
            aria-label="당첨 인원 감소"
          >
            −
          </button>
          <span className="min-w-[2ch] text-center text-2xl font-bold text-foreground">
            {clampedCount}
          </span>
          <button
            type="button"
            onClick={() => adjustCount(1)}
            disabled={clampedCount >= maxWinners}
            className="h-9 w-9 rounded-lg border border-border bg-surface text-lg font-bold text-foreground hover:bg-background disabled:opacity-30"
            aria-label="당첨 인원 증가"
          >
            +
          </button>
        </div>
        <p className="mt-1.5 text-center text-sm text-muted">
          {selectedCount}명 중 {clampedCount}명 당첨
        </p>
        {!canDraw && (
          <p className="mt-1 text-center text-xs text-muted">
            참여 멤버 2명 이상 필요
          </p>
        )}
      </section>

      <button
        type="button"
        onClick={onDraw}
        disabled={!canDraw}
        className="w-full rounded-lg py-3.5 text-base font-bold text-white hover:opacity-90 disabled:opacity-40"
        style={{ backgroundColor: "#ec4899" }}
      >
        💣 꽝뽑기!
      </button>
    </div>
  );
}
