/**
 * 순번제 chore의 차례 계산·권한 판정 pure 함수.
 * Firestore 의존 없음 → 단위 테스트로 검증.
 * operations.ts의 completeRotation/deactivateChoreLog에서 사용.
 */

/** 완료 1회 후 다음 차례 인덱스. length=0이면 0 반환(방어). */
export function nextTurnIndex(current: number, length: number): number {
  if (length <= 0) return 0;
  return (current + 1) % length;
}

/** 비활성화 시 차례 복원 인덱스. length=0이면 0 반환(방어). */
export function restoreTurnIndex(current: number, length: number): number {
  if (length <= 0) return 0;
  return (current - 1 + length) % length;
}

export type CompletionCheck =
  | { ok: true; turnUid: string }
  | { ok: false; reason: "no-members" | "bad-index" | "not-your-turn" | "not-participant" };

/**
 * 완료 권한 판정.
 * - allowProxy=false: actualUid === turnUid 강제
 * - allowProxy=true: actualUid가 rotationOrder에 속하면 통과(차례 멤버는 turnUid 그대로)
 */
export function checkCompletionPermission(
  rotationOrder: string[],
  currentTurnIndex: number,
  allowProxy: boolean,
  actualUid: string,
): CompletionCheck {
  if (rotationOrder.length === 0) return { ok: false, reason: "no-members" };
  const turnUid = rotationOrder[currentTurnIndex];
  if (!turnUid) return { ok: false, reason: "bad-index" };

  if (allowProxy) {
    if (!rotationOrder.includes(actualUid)) {
      return { ok: false, reason: "not-participant" };
    }
  } else if (actualUid !== turnUid) {
    return { ok: false, reason: "not-your-turn" };
  }
  return { ok: true, turnUid };
}
