import { describe, expect, it } from "vitest";
import { drawWinners } from "@/lib/chore/random";

function seedRng(seq: number[]): () => number {
  let i = 0;
  return () => {
    const v = seq[i % seq.length];
    i++;
    return v;
  };
}

describe("drawWinners", () => {
  it("count === 0 → 빈 배열", () => {
    expect(drawWinners(["a", "b", "c"], 0)).toEqual([]);
  });

  it("후보 비어있음 → 빈 배열", () => {
    expect(drawWinners([], 3)).toEqual([]);
  });

  it("count > 후보 수 → 후보 수만큼만 반환", () => {
    const result = drawWinners(["a", "b"], 5, seedRng([0]));
    expect(result.length).toBe(2);
    expect(new Set(result)).toEqual(new Set(["a", "b"]));
  });

  it("결정론적 rng 주입 → 동일 결과", () => {
    const rng = seedRng([0.1, 0.5, 0.9]);
    const r1 = drawWinners(["a", "b", "c", "d"], 2, rng);
    const r2 = drawWinners(["a", "b", "c", "d"], 2, seedRng([0.1, 0.5, 0.9]));
    expect(r1).toEqual(r2);
  });

  it("결과에 중복 없음 (Set 크기 === 길이)", () => {
    const candidates = ["a", "b", "c", "d", "e"];
    for (let i = 0; i < 20; i++) {
      const result = drawWinners(candidates, 3);
      expect(new Set(result).size).toBe(result.length);
    }
  });

  it("셔플 후 원소 보존 (count === length)", () => {
    const candidates = ["a", "b", "c", "d", "e"];
    const result = drawWinners(candidates, candidates.length);
    expect([...result].sort()).toEqual([...candidates].sort());
  });

  it("원본 배열 비파괴", () => {
    const candidates = ["a", "b", "c"];
    const snapshot = [...candidates];
    drawWinners(candidates, 2);
    expect(candidates).toEqual(snapshot);
  });

  it("count 음수 → 빈 배열", () => {
    expect(drawWinners(["a", "b"], -1)).toEqual([]);
  });
});
