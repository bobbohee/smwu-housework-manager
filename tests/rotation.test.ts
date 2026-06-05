import { describe, expect, it } from "vitest";
import {
  checkCompletionPermission,
  nextTurnIndex,
  restoreTurnIndex,
} from "@/lib/chore/rotation";

describe("nextTurnIndex", () => {
  it("0 → 1 (3명)", () => {
    expect(nextTurnIndex(0, 3)).toBe(1);
  });

  it("1 → 2 (3명)", () => {
    expect(nextTurnIndex(1, 3)).toBe(2);
  });

  it("마지막 → 0 (wrap around)", () => {
    expect(nextTurnIndex(2, 3)).toBe(0);
  });

  it("1명 그룹 → 항상 0", () => {
    expect(nextTurnIndex(0, 1)).toBe(0);
  });

  it("length=0 방어 → 0", () => {
    expect(nextTurnIndex(0, 0)).toBe(0);
  });
});

describe("restoreTurnIndex", () => {
  it("1 → 0", () => {
    expect(restoreTurnIndex(1, 3)).toBe(0);
  });

  it("2 → 1", () => {
    expect(restoreTurnIndex(2, 3)).toBe(1);
  });

  it("0 → 마지막 (wrap around)", () => {
    expect(restoreTurnIndex(0, 3)).toBe(2);
  });

  it("1명 그룹 → 항상 0", () => {
    expect(restoreTurnIndex(0, 1)).toBe(0);
  });

  it("length=0 방어 → 0", () => {
    expect(restoreTurnIndex(0, 0)).toBe(0);
  });

  it("nextTurnIndex 후 restoreTurnIndex = 원래 값", () => {
    for (let len = 1; len <= 5; len++) {
      for (let i = 0; i < len; i++) {
        const next = nextTurnIndex(i, len);
        expect(restoreTurnIndex(next, len)).toBe(i);
      }
    }
  });
});

describe("checkCompletionPermission — allowProxy=false", () => {
  const order = ["alice", "bob", "carol"];

  it("본인 차례에 본인 완료 → 통과", () => {
    const result = checkCompletionPermission(order, 1, false, "bob");
    expect(result).toEqual({ ok: true, turnUid: "bob" });
  });

  it("타인 차례에 다른 사람 완료 → 거부 not-your-turn", () => {
    const result = checkCompletionPermission(order, 1, false, "carol");
    expect(result).toEqual({ ok: false, reason: "not-your-turn" });
  });

  it("참여 멤버 아닌 사람도 거부 (proxy=false면 not-your-turn 분기에서 걸림)", () => {
    const result = checkCompletionPermission(order, 0, false, "stranger");
    expect(result).toEqual({ ok: false, reason: "not-your-turn" });
  });
});

describe("checkCompletionPermission — allowProxy=true", () => {
  const order = ["alice", "bob", "carol"];

  it("본인 차례에 본인 완료 → 통과", () => {
    const result = checkCompletionPermission(order, 1, true, "bob");
    expect(result).toEqual({ ok: true, turnUid: "bob" });
  });

  it("타인 차례에 다른 참여 멤버 완료 → 통과 (turnUid는 차례 멤버)", () => {
    const result = checkCompletionPermission(order, 1, true, "carol");
    expect(result).toEqual({ ok: true, turnUid: "bob" });
  });

  it("참여 멤버 아닌 외부인 거부 → not-participant", () => {
    const result = checkCompletionPermission(order, 0, true, "stranger");
    expect(result).toEqual({ ok: false, reason: "not-participant" });
  });
});

describe("checkCompletionPermission — edge cases", () => {
  it("빈 rotationOrder → no-members", () => {
    expect(checkCompletionPermission([], 0, false, "alice")).toEqual({
      ok: false,
      reason: "no-members",
    });
  });

  it("currentTurnIndex가 범위 밖 → bad-index", () => {
    expect(checkCompletionPermission(["alice", "bob"], 5, false, "alice")).toEqual({
      ok: false,
      reason: "bad-index",
    });
  });

  it("currentTurnIndex가 음수 → bad-index", () => {
    expect(checkCompletionPermission(["alice"], -1, false, "alice")).toEqual({
      ok: false,
      reason: "bad-index",
    });
  });
});
