import { describe, expect, it } from "vitest";
import {
  aggregateByChore,
  aggregateByMember,
} from "@/lib/chore/stats";
import type { ChoreDoc, ChoreLogDoc } from "@/lib/types/firestore";

function log(
  partial: Partial<ChoreLogDoc> & Pick<ChoreLogDoc, "completedBy" | "choreId">,
): ChoreLogDoc {
  return {
    id: partial.id ?? "log-" + Math.random().toString(36).slice(2, 8),
    choreId: partial.choreId,
    groupId: partial.groupId ?? "g1",
    completedBy: partial.completedBy,
    completedByActual: partial.completedByActual ?? partial.completedBy,
    completedAt: partial.completedAt ?? ({} as ChoreLogDoc["completedAt"]),
    active: partial.active ?? true,
  };
}

function chore(
  partial: Partial<ChoreDoc> & Pick<ChoreDoc, "id" | "name">,
): ChoreDoc {
  return {
    id: partial.id,
    groupId: partial.groupId ?? "g1",
    name: partial.name,
    mode: partial.mode ?? "rotation",
    color: partial.color ?? "#4A90D9",
    rotationOrder: partial.rotationOrder ?? [],
    currentTurnIndex: partial.currentTurnIndex ?? 0,
    allowProxyComplete: partial.allowProxyComplete ?? false,
    fixedSchedule: partial.fixedSchedule ?? [],
    rules: partial.rules ?? [],
    createdAt: partial.createdAt ?? ({} as ChoreDoc["createdAt"]),
  };
}

describe("aggregateByMember", () => {
  const members = ["u1", "u2", "u3"];

  it("빈 로그 → 모든 멤버 count 0", () => {
    const result = aggregateByMember([], members);
    expect(result).toEqual([
      { uid: "u1", count: 0 },
      { uid: "u2", count: 0 },
      { uid: "u3", count: 0 },
    ]);
  });

  it("단일 로그 → 해당 멤버 +1", () => {
    const result = aggregateByMember(
      [log({ choreId: "c1", completedBy: "u2" })],
      members,
    );
    expect(result.find((r) => r.uid === "u2")?.count).toBe(1);
    expect(result.find((r) => r.uid === "u1")?.count).toBe(0);
  });

  it("active=false 로그 무시", () => {
    const result = aggregateByMember(
      [
        log({ choreId: "c1", completedBy: "u1", active: true }),
        log({ choreId: "c1", completedBy: "u1", active: false }),
      ],
      members,
    );
    expect(result.find((r) => r.uid === "u1")?.count).toBe(1);
  });

  it("강퇴 멤버(memberUids 외) 로그 제외", () => {
    const result = aggregateByMember(
      [
        log({ choreId: "c1", completedBy: "u1" }),
        log({ choreId: "c1", completedBy: "u-kicked" }),
      ],
      members,
    );
    expect(result.some((r) => r.uid === "u-kicked")).toBe(false);
    expect(result.find((r) => r.uid === "u1")?.count).toBe(1);
  });

  it("completedBy 기준 카운트 (completedByActual 무시 = 대신 완료)", () => {
    const result = aggregateByMember(
      [
        log({
          choreId: "c1",
          completedBy: "u1",
          completedByActual: "u2",
        }),
      ],
      members,
    );
    expect(result.find((r) => r.uid === "u1")?.count).toBe(1);
    expect(result.find((r) => r.uid === "u2")?.count).toBe(0);
  });

  it("count 내림차순 + uid 안정 정렬", () => {
    const result = aggregateByMember(
      [
        log({ choreId: "c1", completedBy: "u2" }),
        log({ choreId: "c1", completedBy: "u2" }),
        log({ choreId: "c1", completedBy: "u1" }),
      ],
      members,
    );
    expect(result.map((r) => r.uid)).toEqual(["u2", "u1", "u3"]);
  });
});

describe("aggregateByChore", () => {
  const chores = [
    chore({ id: "c1", name: "설거지", color: "#4A90D9" }),
    chore({ id: "c2", name: "빨래", color: "#E91E8C" }),
    chore({ id: "c3", name: "청소", color: "#F39C12" }),
  ];

  it("빈 로그 → 모든 chore count 0 + percent 0", () => {
    const result = aggregateByChore([], chores);
    expect(result.every((r) => r.count === 0 && r.percent === 0)).toBe(true);
    expect(result.map((r) => r.choreId)).toEqual(["c1", "c2", "c3"]);
  });

  it("chore 이름·색상 lookup", () => {
    const result = aggregateByChore(
      [log({ choreId: "c1", completedBy: "u1" })],
      chores,
    );
    const c1 = result.find((r) => r.choreId === "c1")!;
    expect(c1.name).toBe("설거지");
    expect(c1.color).toBe("#4A90D9");
  });

  it("active=false 무시", () => {
    const result = aggregateByChore(
      [
        log({ choreId: "c1", completedBy: "u1", active: true }),
        log({ choreId: "c1", completedBy: "u1", active: false }),
      ],
      chores,
    );
    expect(result.find((r) => r.choreId === "c1")?.count).toBe(1);
  });

  it("삭제된 chore (chores에 없는 choreId) 무시", () => {
    const result = aggregateByChore(
      [
        log({ choreId: "c1", completedBy: "u1" }),
        log({ choreId: "c-deleted", completedBy: "u1" }),
      ],
      chores,
    );
    expect(result.some((r) => r.choreId === "c-deleted")).toBe(false);
    expect(result.find((r) => r.choreId === "c1")?.count).toBe(1);
  });

  it("percent = (count/max)*100 반올림", () => {
    const logs: ChoreLogDoc[] = [];
    for (let i = 0; i < 10; i++) logs.push(log({ choreId: "c1", completedBy: "u1" }));
    for (let i = 0; i < 5; i++) logs.push(log({ choreId: "c2", completedBy: "u1" }));
    for (let i = 0; i < 3; i++) logs.push(log({ choreId: "c3", completedBy: "u1" }));
    const result = aggregateByChore(logs, chores);
    expect(result.find((r) => r.choreId === "c1")?.percent).toBe(100);
    expect(result.find((r) => r.choreId === "c2")?.percent).toBe(50);
    expect(result.find((r) => r.choreId === "c3")?.percent).toBe(30);
  });

  it("count 내림차순 + chore 정의 순서 안정 tie-break", () => {
    const result = aggregateByChore(
      [
        log({ choreId: "c3", completedBy: "u1" }),
        log({ choreId: "c3", completedBy: "u1" }),
        log({ choreId: "c1", completedBy: "u1" }),
      ],
      chores,
    );
    expect(result.map((r) => r.choreId)).toEqual(["c3", "c1", "c2"]);
  });
});
