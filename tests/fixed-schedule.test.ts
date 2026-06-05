import { describe, expect, it } from "vitest";
import {
  daysBetween,
  dutyUidsForToday,
  isOnDutyToday,
  parseLocalDate,
} from "@/lib/chore/fixed-schedule";

describe("parseLocalDate", () => {
  it("YYYY-MM-DD를 로컬 자정 Date로 변환", () => {
    const d = parseLocalDate("2026-03-31");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2); // 0-indexed
    expect(d.getDate()).toBe(31);
    expect(d.getHours()).toBe(0);
  });

  it("잘못된 형식은 throw", () => {
    expect(() => parseLocalDate("2026/03/31")).toThrow();
    expect(() => parseLocalDate("invalid")).toThrow();
  });
});

describe("daysBetween", () => {
  it("같은 날 = 0", () => {
    expect(daysBetween(parseLocalDate("2026-03-31"), parseLocalDate("2026-03-31"))).toBe(0);
  });

  it("다음날 = 1", () => {
    expect(daysBetween(parseLocalDate("2026-03-31"), parseLocalDate("2026-04-01"))).toBe(1);
  });

  it("2주 후 = 14", () => {
    expect(daysBetween(parseLocalDate("2026-03-31"), parseLocalDate("2026-04-14"))).toBe(14);
  });

  it("이전 날짜 = 음수", () => {
    expect(daysBetween(parseLocalDate("2026-04-01"), parseLocalDate("2026-03-31"))).toBe(-1);
  });
});

describe("isOnDutyToday — weekly", () => {
  const monWedEntry = {
    uid: "u1",
    type: "weekly" as const,
    weekdays: [1, 3], // 월, 수
  };

  it("월요일 → 담당", () => {
    // 2026-03-30 = 월요일
    expect(isOnDutyToday(monWedEntry, parseLocalDate("2026-03-30"))).toBe(true);
  });

  it("수요일 → 담당", () => {
    expect(isOnDutyToday(monWedEntry, parseLocalDate("2026-04-01"))).toBe(true);
  });

  it("금요일 → 비담당", () => {
    expect(isOnDutyToday(monWedEntry, parseLocalDate("2026-04-03"))).toBe(false);
  });

  it("빈 weekdays → 항상 비담당", () => {
    expect(
      isOnDutyToday(
        { uid: "u1", type: "weekly", weekdays: [] },
        parseLocalDate("2026-03-30"),
      ),
    ).toBe(false);
  });
});

describe("isOnDutyToday — interval", () => {
  const biweekly = {
    uid: "u1",
    type: "interval" as const,
    intervalDays: 14,
    startDate: "2026-03-31",
  };

  it("startDate 당일 → 담당", () => {
    expect(isOnDutyToday(biweekly, parseLocalDate("2026-03-31"))).toBe(true);
  });

  it("14일 후 → 담당", () => {
    expect(isOnDutyToday(biweekly, parseLocalDate("2026-04-14"))).toBe(true);
  });

  it("28일 후 → 담당", () => {
    expect(isOnDutyToday(biweekly, parseLocalDate("2026-04-28"))).toBe(true);
  });

  it("1일 후 → 비담당", () => {
    expect(isOnDutyToday(biweekly, parseLocalDate("2026-04-01"))).toBe(false);
  });

  it("13일 후 → 비담당", () => {
    expect(isOnDutyToday(biweekly, parseLocalDate("2026-04-13"))).toBe(false);
  });

  it("startDate 이전 → 비담당", () => {
    expect(isOnDutyToday(biweekly, parseLocalDate("2026-03-30"))).toBe(false);
  });

  it("intervalDays=0 이하 → 비담당 (방어)", () => {
    expect(
      isOnDutyToday(
        { uid: "u1", type: "interval", intervalDays: 0, startDate: "2026-03-31" },
        parseLocalDate("2026-03-31"),
      ),
    ).toBe(false);
  });

  it("intervalDays=1 → 매일 담당", () => {
    const daily = {
      uid: "u1",
      type: "interval" as const,
      intervalDays: 1,
      startDate: "2026-03-31",
    };
    expect(isOnDutyToday(daily, parseLocalDate("2026-03-31"))).toBe(true);
    expect(isOnDutyToday(daily, parseLocalDate("2026-04-01"))).toBe(true);
    expect(isOnDutyToday(daily, parseLocalDate("2026-04-02"))).toBe(true);
  });
});

describe("dutyUidsForToday", () => {
  it("여러 entry 중 오늘 담당만 모음 + 중복 제거", () => {
    const schedule = [
      { uid: "u1", type: "weekly" as const, weekdays: [1] }, // 월
      { uid: "u2", type: "weekly" as const, weekdays: [3] }, // 수
      { uid: "u3", type: "interval" as const, intervalDays: 14, startDate: "2026-03-30" }, // 월
      { uid: "u1", type: "interval" as const, intervalDays: 7, startDate: "2026-03-30" }, // u1 중복
    ];
    // 2026-03-30 = 월요일, startDate와 동일
    const uids = dutyUidsForToday(schedule, parseLocalDate("2026-03-30"));
    expect(uids.sort()).toEqual(["u1", "u3"]);
  });

  it("아무도 담당 아니면 빈 배열", () => {
    const schedule = [
      { uid: "u1", type: "weekly" as const, weekdays: [1] },
    ];
    expect(dutyUidsForToday(schedule, parseLocalDate("2026-04-03"))).toEqual([]);
  });
});
