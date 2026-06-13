import type { ChoreDoc, ChoreLogDoc } from "@/lib/types/firestore";

export interface MemberStat {
  uid: string;
  count: number;
}

export interface ChoreStat {
  choreId: string;
  name: string;
  color: string;
  count: number;
  percent: number;
}

export function aggregateByMember(
  logs: ChoreLogDoc[],
  memberUids: string[],
): MemberStat[] {
  const counts = new Map<string, number>();
  for (const uid of memberUids) counts.set(uid, 0);

  for (const log of logs) {
    if (!log.active) continue;
    if (!counts.has(log.completedBy)) continue;
    counts.set(log.completedBy, (counts.get(log.completedBy) ?? 0) + 1);
  }

  const orderIndex = new Map(memberUids.map((uid, i) => [uid, i]));
  return memberUids
    .map((uid) => ({ uid, count: counts.get(uid) ?? 0 }))
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return (orderIndex.get(a.uid) ?? 0) - (orderIndex.get(b.uid) ?? 0);
    });
}

export function aggregateByChore(
  logs: ChoreLogDoc[],
  chores: ChoreDoc[],
): ChoreStat[] {
  const counts = new Map<string, number>();
  for (const c of chores) counts.set(c.id, 0);

  for (const log of logs) {
    if (!log.active) continue;
    if (!counts.has(log.choreId)) continue;
    counts.set(log.choreId, (counts.get(log.choreId) ?? 0) + 1);
  }

  const max = Math.max(0, ...counts.values());
  const orderIndex = new Map(chores.map((c, i) => [c.id, i]));

  return chores
    .map((c) => {
      const count = counts.get(c.id) ?? 0;
      const percent = max > 0 ? Math.round((count / max) * 100) : 0;
      return {
        choreId: c.id,
        name: c.name,
        color: c.color,
        count,
        percent,
      };
    })
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return (orderIndex.get(a.choreId) ?? 0) - (orderIndex.get(b.choreId) ?? 0);
    });
}
