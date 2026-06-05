import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import {
  choreLogCol,
  choreLogRef,
  choreRef,
  choresCol,
} from "@/lib/firebase/collections";
import type {
  ChoreDoc,
  ChoreMode,
  FixedScheduleEntry,
} from "@/lib/types/firestore";
import {
  checkCompletionPermission,
  nextTurnIndex as computeNextTurnIndex,
  restoreTurnIndex,
} from "@/lib/chore/rotation";

export const COLOR_PALETTE = [
  "#4A90D9",
  "#E74C3C",
  "#2ECC71",
  "#F39C12",
  "#9B59B6",
  "#1ABC9C",
  "#E91E8C",
  "#34495E",
  "#95A5A6",
  "#F1C40F",
] as const;

export type PaletteColor = (typeof COLOR_PALETTE)[number];

export class ChoreError extends Error {}

const MAX_NAME_LENGTH = 30;
const MAX_REASON_LENGTH = 200;

function isPaletteColor(color: string): color is PaletteColor {
  return (COLOR_PALETTE as readonly string[]).includes(color);
}

function normalizeName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new ChoreError("집안일 이름을 입력해주세요.");
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new ChoreError(`집안일 이름은 ${MAX_NAME_LENGTH}자 이내로 입력해주세요.`);
  }
  return trimmed;
}

function assertValidMode(mode: ChoreMode) {
  if (mode !== "rotation" && mode !== "fixed") {
    throw new ChoreError("집안일 모드가 올바르지 않습니다.");
  }
}

function assertValidColor(color: string) {
  if (!isPaletteColor(color)) {
    throw new ChoreError("팔레트의 색상을 선택해주세요.");
  }
}

export interface CreateChoreInput {
  groupId: string;
  name: string;
  mode: ChoreMode;
  color: string;
  rotationOrder?: string[];
  allowProxyComplete?: boolean;
  fixedSchedule?: FixedScheduleEntry[];
  rules?: string[];
}

export async function createChore(input: CreateChoreInput): Promise<string> {
  const name = normalizeName(input.name);
  assertValidMode(input.mode);
  assertValidColor(input.color);
  if (!input.groupId) {
    throw new ChoreError("그룹 정보가 올바르지 않습니다.");
  }

  const newRef = doc(choresCol());
  await setDoc(newRef, {
    id: newRef.id,
    groupId: input.groupId,
    name,
    mode: input.mode,
    color: input.color,
    rotationOrder: input.rotationOrder ?? [],
    currentTurnIndex: 0,
    allowProxyComplete: input.allowProxyComplete ?? false,
    fixedSchedule: input.fixedSchedule ?? [],
    rules: input.rules ?? [],
    // Firestore Timestamp는 serverTimestamp()로 채움. converter가 stripId 처리.
    createdAt: serverTimestamp() as unknown as ChoreDoc["createdAt"],
  });
  return newRef.id;
}

export type UpdateChorePatch = Partial<
  Pick<
    ChoreDoc,
    | "name"
    | "color"
    | "rotationOrder"
    | "allowProxyComplete"
    | "fixedSchedule"
    | "rules"
  >
>;

export async function updateChore(
  choreId: string,
  patch: UpdateChorePatch,
): Promise<void> {
  const next: UpdateChorePatch = { ...patch };
  if (next.name !== undefined) {
    next.name = normalizeName(next.name);
  }
  if (next.color !== undefined) {
    assertValidColor(next.color);
  }
  await updateDoc(choreRef(choreId), next);
}

export async function deleteChore(choreId: string): Promise<void> {
  // choreLog는 delete 금지(Rules) → 보존. chore doc만 제거.
  await deleteDoc(choreRef(choreId));
}

export interface CompleteRotationInput {
  choreId: string;
  actualUid: string;
}

export interface CompleteRotationResult {
  logId: string;
  completedBy: string;
  nextTurnIndex: number;
}

export async function completeRotation(
  input: CompleteRotationInput,
): Promise<CompleteRotationResult> {
  const db = getDb();
  const choreSnap = await getDoc(choreRef(input.choreId));
  if (!choreSnap.exists()) {
    throw new ChoreError("집안일을 찾을 수 없습니다.");
  }
  const chore = choreSnap.data();
  if (chore.mode !== "rotation") {
    throw new ChoreError("순번제 집안일이 아닙니다.");
  }

  const check = checkCompletionPermission(
    chore.rotationOrder,
    chore.currentTurnIndex,
    chore.allowProxyComplete,
    input.actualUid,
  );
  if (!check.ok) {
    throw new ChoreError(reasonToMessage(check.reason));
  }
  const turnUid = check.turnUid;

  const newLogRef = doc(choreLogCol());
  const nextTurnIndex = computeNextTurnIndex(
    chore.currentTurnIndex,
    chore.rotationOrder.length,
  );

  const batch = writeBatch(db);
  batch.set(newLogRef, {
    id: newLogRef.id,
    choreId: input.choreId,
    groupId: chore.groupId,
    completedBy: turnUid,
    completedByActual: input.actualUid,
    completedAt: serverTimestamp() as unknown as ChoreDoc["createdAt"],
    type: "rotation",
    active: true,
  });
  batch.update(choreRef(input.choreId), {
    currentTurnIndex: nextTurnIndex,
  });
  await batch.commit();

  return {
    logId: newLogRef.id,
    completedBy: turnUid,
    nextTurnIndex,
  };
}

export interface RecordRandomDrawInput {
  choreId: string;
  groupId: string;
  winnerUid: string;
  actualUid: string;
}

export async function recordRandomDraw(
  input: RecordRandomDrawInput,
): Promise<string> {
  if (!input.choreId) throw new ChoreError("집안일 정보가 올바르지 않습니다.");
  if (!input.groupId) throw new ChoreError("그룹 정보가 올바르지 않습니다.");
  if (!input.winnerUid) throw new ChoreError("당첨자 정보가 올바르지 않습니다.");

  const newLogRef = doc(choreLogCol());
  await setDoc(newLogRef, {
    id: newLogRef.id,
    choreId: input.choreId,
    groupId: input.groupId,
    completedBy: input.winnerUid,
    completedByActual: input.actualUid,
    completedAt: serverTimestamp() as unknown as ChoreDoc["createdAt"],
    type: "random",
    active: true,
  });
  return newLogRef.id;
}

export interface DeactivateChoreLogInput {
  logId: string;
  ownerUid: string;
  reason: string;
}

export async function deactivateChoreLog(
  input: DeactivateChoreLogInput,
): Promise<void> {
  const reason = input.reason.trim();
  if (!reason) throw new ChoreError("비활성화 사유를 입력해주세요.");
  if (reason.length > MAX_REASON_LENGTH) {
    throw new ChoreError(
      `사유는 ${MAX_REASON_LENGTH}자 이내로 입력해주세요.`,
    );
  }

  const db = getDb();
  const logSnap = await getDoc(choreLogRef(input.logId));
  if (!logSnap.exists()) {
    throw new ChoreError("완료 기록을 찾을 수 없습니다.");
  }
  const log = logSnap.data();
  if (!log.active) {
    throw new ChoreError("이미 비활성화된 기록입니다.");
  }

  const batch = writeBatch(db);
  batch.update(choreLogRef(input.logId), {
    active: false,
    deactivateReason: reason,
    deactivatedBy: input.ownerUid,
    deactivatedAt: serverTimestamp() as unknown as ChoreDoc["createdAt"],
  });

  // 순번제 비활성화 → currentTurnIndex 1칸 복원.
  // 주의: 과거 어떤 log를 비활성화해도 -1. UI에서 가장 최근 항목 한정 권장.
  if (log.type === "rotation") {
    const choreSnap = await getDoc(choreRef(log.choreId));
    if (choreSnap.exists()) {
      const chore = choreSnap.data();
      if (chore.mode === "rotation" && chore.rotationOrder.length > 0) {
        const restored = restoreTurnIndex(
          chore.currentTurnIndex,
          chore.rotationOrder.length,
        );
        batch.update(choreRef(log.choreId), { currentTurnIndex: restored });
      }
    }
  }

  await batch.commit();
}

function reasonToMessage(reason: string): string {
  switch (reason) {
    case "no-members":
      return "참여 멤버가 없습니다.";
    case "bad-index":
      return "현재 차례 정보가 올바르지 않습니다.";
    case "not-your-turn":
      return "본인 차례가 아닙니다.";
    case "not-participant":
      return "참여 멤버만 완료할 수 있습니다.";
    default:
      return "완료할 수 없습니다.";
  }
}
