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
  "#3B82F6", // blue
  "#EF4444", // red
  "#10B981", // green
  "#F59E0B", // amber
  "#A855F7", // purple
  "#14B8A6", // teal
  "#EC4899", // pink
  "#475569", // slate
  "#94A3B8", // slate-light
  "#EAB308", // yellow
] as const;

// 기존 chore에 저장된 v1 팔레트(채도 낮은 색상). 표시·편집 호환성을 위해 valid로 인정.
const LEGACY_PALETTE = [
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

// 기존 chore.color(legacy hex)를 새 vivid 팔레트로 표시 시점 매핑.
// 데이터 마이그레이션 없이 일관된 시각 유지.
const LEGACY_TO_VIVID: Record<string, string> = LEGACY_PALETTE.reduce(
  (acc, legacy, i) => {
    acc[legacy.toUpperCase()] = COLOR_PALETTE[i];
    return acc;
  },
  {} as Record<string, string>,
);

export function resolveChoreColor(color: string | undefined): string {
  if (!color) return COLOR_PALETTE[0];
  return LEGACY_TO_VIVID[color.toUpperCase()] ?? color;
}

export type PaletteColor = (typeof COLOR_PALETTE)[number];

export const EMOJI_PALETTE = [
  "🍽️",
  "👕",
  "🧹",
  "🍚",
  "🗑️",
  "🛁",
  "🛋️",
  "🛏️",
  "🚽",
  "🧺",
  "🧽",
  "🚿",
  "🪴",
  "🐶",
  "📦",
  "✨",
] as const;

export const DEFAULT_EMOJI = "📋";

const NAME_EMOJI_RULES: Array<{ re: RegExp; emoji: string }> = [
  { re: /설거지|식기|싱크/i, emoji: "🍽️" },
  { re: /빨래|세탁/i, emoji: "👕" },
  { re: /거실/i, emoji: "🛋️" },
  { re: /방.*청소|침실/i, emoji: "🛏️" },
  { re: /밥|요리|식사/i, emoji: "🍚" },
  { re: /쓰레기|재활용/i, emoji: "🗑️" },
  { re: /화장실|욕실|변기|샤워/i, emoji: "🚽" },
  { re: /청소/i, emoji: "🧹" },
];

export function resolveChoreEmoji(chore: {
  emoji?: string;
  name: string;
}): string {
  if (chore.emoji) return chore.emoji;
  for (const { re, emoji } of NAME_EMOJI_RULES) {
    if (re.test(chore.name)) return emoji;
  }
  return DEFAULT_EMOJI;
}

export class ChoreError extends Error {}

const MAX_NAME_LENGTH = 30;
const MAX_REASON_LENGTH = 200;

function isPaletteColor(color: string): color is PaletteColor {
  return (
    (COLOR_PALETTE as readonly string[]).includes(color) ||
    (LEGACY_PALETTE as readonly string[]).includes(color)
  );
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
  emoji?: string;
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
    emoji: input.emoji ?? DEFAULT_EMOJI,
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
    | "emoji"
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

  // 순번제 chore 비활성화 → currentTurnIndex 1칸 복원.
  // 주의: 과거 어떤 log를 비활성화해도 -1. UI에서 가장 최근 항목 한정 권장.
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
