import { describe, expect, it } from "vitest";
import {
  generateInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} from "@/lib/group/invite-code";

describe("generateInviteCode", () => {
  it("길이 6자리", () => {
    for (let i = 0; i < 100; i++) {
      expect(generateInviteCode()).toHaveLength(6);
    }
  });

  it("허용 문자만 포함 (혼동문자 0/O·1/I/L 제외)", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateInviteCode();
      expect(code).toMatch(/^[A-HJ-KM-NP-Z2-9]{6}$/);
      expect(code).not.toMatch(/[0OIL1]/);
    }
  });

  it("랜덤성 (500번 중복률 0.5% 미만)", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 500; i++) codes.add(generateInviteCode());
    expect(codes.size).toBeGreaterThanOrEqual(498);
  });
});

describe("isValidInviteCode", () => {
  it.each(["ABCD23", "JK2N5P", "ZYXW98"])("통과: %s", (code) => {
    expect(isValidInviteCode(code)).toBe(true);
  });

  it.each([
    "abcd23", // 소문자
    "ABCD2", // 5자
    "ABCD234", // 7자
    "ABCD0L", // 0/L 포함
    "ABCD1I", // 1/I 포함
    "ABCD2O", // O 포함
    "ABCD-3", // 기호
  ])("거부: %s", (code) => {
    expect(isValidInviteCode(code)).toBe(false);
  });
});

describe("normalizeInviteCode", () => {
  it("공백 제거 + 대문자 변환", () => {
    expect(normalizeInviteCode("  abcd23  ")).toBe("ABCD23");
    expect(normalizeInviteCode("jk2n5p")).toBe("JK2N5P");
  });
});
