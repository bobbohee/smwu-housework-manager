import type { Timestamp } from "firebase/firestore";

export interface UserDoc {
  uid: string;
  name: string;
  email: string;
  groupIds: string[];
  createdAt: Timestamp;
}

export interface GroupDoc {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  memberUids: string[];
  /** uid → 회원가입 시점 user.name 캐시. users 컬렉션은 self만 read 가능하므로 멤버 이름 노출용. */
  memberNames: Record<string, string>;
  createdAt: Timestamp;
}

export interface InviteCodeDoc {
  code: string;
  groupId: string;
  ownerId: string;
  createdAt: Timestamp;
}

export type ChoreMode = "rotation" | "fixed";

export type FixedScheduleEntry =
  | { uid: string; type: "weekly"; weekdays: number[] }
  | { uid: string; type: "interval"; intervalDays: number; startDate: string };

export interface ChoreDoc {
  id: string;
  groupId: string;
  name: string;
  mode: ChoreMode;
  color: string;
  rotationOrder: string[];
  currentTurnIndex: number;
  allowProxyComplete: boolean;
  fixedSchedule: FixedScheduleEntry[];
  rules: string[];
  createdAt: Timestamp;
}

export type ChoreLogType = "rotation" | "random";

export interface ChoreLogDoc {
  id: string;
  choreId: string;
  groupId: string;
  completedBy: string;
  completedByActual: string;
  completedAt: Timestamp;
  type: ChoreLogType;
  active: boolean;
  deactivateReason?: string;
  deactivatedBy?: string;
  deactivatedAt?: Timestamp;
}
