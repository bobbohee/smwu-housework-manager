import type { FixedScheduleEntry } from "@/lib/types/firestore";

// 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토 (JS Date.getDay() 규약)
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * "YYYY-MM-DD" → Date(로컬 자정).
 * Date 생성자에 "YYYY-MM-DD"를 직접 넘기면 UTC로 해석되어 타임존 차이가 생긴다.
 * 캘린더 표시는 로컬 기준이므로 명시적으로 로컬 자정으로 변환.
 */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) {
    throw new Error(`invalid ISO date: ${iso}`);
  }
  return new Date(y, m - 1, d);
}

/** 시·분·초·ms를 0으로 잘라낸 로컬 자정 시각. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** today와 startDate(둘 다 로컬 자정)의 일수 차이. 양수면 today가 이후. */
export function daysBetween(startDate: Date, today: Date): number {
  const a = startOfLocalDay(startDate).getTime();
  const b = startOfLocalDay(today).getTime();
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * 한 fixedSchedule entry가 오늘 담당인지 판정.
 * - weekly: 오늘 요일이 weekdays[]에 포함
 * - interval: today ≥ startDate, (today − startDate) % intervalDays === 0
 */
export function isOnDutyToday(
  entry: FixedScheduleEntry,
  today: Date,
): boolean {
  if (entry.type === "weekly") {
    const todayDow = today.getDay() as Weekday;
    return entry.weekdays.includes(todayDow);
  }
  if (entry.intervalDays <= 0) return false;
  const start = parseLocalDate(entry.startDate);
  const diff = daysBetween(start, today);
  if (diff < 0) return false;
  return diff % entry.intervalDays === 0;
}

/** 한 chore의 fixedSchedule에서 오늘 담당 uid 목록을 반환 (중복 제거). */
export function dutyUidsForToday(
  schedule: FixedScheduleEntry[],
  today: Date,
): string[] {
  const set = new Set<string>();
  for (const entry of schedule) {
    if (isOnDutyToday(entry, today)) set.add(entry.uid);
  }
  return Array.from(set);
}
