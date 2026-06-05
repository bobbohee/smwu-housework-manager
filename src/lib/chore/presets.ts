import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { choresCol } from "@/lib/firebase/collections";
import type { ChoreDoc, ChoreMode } from "@/lib/types/firestore";
import { COLOR_PALETTE, type PaletteColor } from "@/lib/chore/operations";

/**
 * 프리셋 정의. 그룹 생성 직후 사용자가 선택한 프리셋을 chores 컬렉션에 "복사본"으로 생성한다.
 * 이후 그룹은 이름·색상·모드·순서·규칙·참여 멤버를 자유롭게 수정 가능.
 *
 * 프리셋은 ID 아닌 slug로 식별 (UI 체크박스 매칭용).
 */
export interface ChorePreset {
  slug: string;
  name: string;
  mode: ChoreMode;
  defaultColor: PaletteColor;
  defaultRules?: string[];
}

export const CHORE_PRESETS: readonly ChorePreset[] = [
  // 순번제 (참여 멤버·순서는 그룹이 직접 지정)
  {
    slug: "dishes",
    name: "설거지",
    mode: "rotation",
    defaultColor: COLOR_PALETTE[0], // 블루
    defaultRules: ["음식물쓰레기 비우기", "싱크대 물기 닦기"],
  },
  {
    slug: "laundry",
    name: "빨래",
    mode: "rotation",
    defaultColor: COLOR_PALETTE[2], // 그린
  },
  {
    slug: "living-room",
    name: "거실 청소",
    mode: "rotation",
    defaultColor: COLOR_PALETTE[3], // 오렌지
  },
  {
    slug: "room",
    name: "방 청소",
    mode: "rotation",
    defaultColor: COLOR_PALETTE[4], // 퍼플
  },
  {
    slug: "cooking",
    name: "밥하기",
    mode: "rotation",
    defaultColor: COLOR_PALETTE[9], // 옐로우
  },
  // 고정제 (스케줄은 그룹이 직접 지정)
  {
    slug: "food-waste",
    name: "음식물쓰레기 비우기",
    mode: "fixed",
    defaultColor: COLOR_PALETTE[5], // 틸
  },
  {
    slug: "trash",
    name: "일반쓰레기 배출",
    mode: "fixed",
    defaultColor: COLOR_PALETTE[7], // 네이비
  },
  {
    slug: "bathroom",
    name: "화장실 청소",
    mode: "fixed",
    defaultColor: COLOR_PALETTE[1], // 레드
  },
] as const;

export function getPresetBySlug(slug: string): ChorePreset | undefined {
  return CHORE_PRESETS.find((p) => p.slug === slug);
}

/**
 * 선택된 프리셋들을 chores 컬렉션에 batch로 생성한다.
 * - 빈 배열도 허용 (프리셋 0개 선택 = "빈 화면에서 시작")
 * - 참여 멤버/순서/스케줄은 비워둠 → 사용자가 집안일 관리 페이지에서 채움
 * - allowProxyComplete 기본 false
 *
 * 반환: 생성된 chore ID 배열 (입력 순서 유지)
 */
export async function createChoresFromPresets(
  groupId: string,
  presetSlugs: string[],
): Promise<string[]> {
  if (!groupId) throw new Error("groupId가 필요합니다.");
  if (presetSlugs.length === 0) return [];

  const db = getDb();
  const batch = writeBatch(db);
  const newIds: string[] = [];

  for (const slug of presetSlugs) {
    const preset = getPresetBySlug(slug);
    if (!preset) continue;

    const newRef = doc(choresCol());
    batch.set(newRef, {
      id: newRef.id,
      groupId,
      name: preset.name,
      mode: preset.mode,
      color: preset.defaultColor,
      rotationOrder: [],
      currentTurnIndex: 0,
      allowProxyComplete: false,
      fixedSchedule: [],
      rules: preset.defaultRules ?? [],
      createdAt: serverTimestamp() as unknown as ChoreDoc["createdAt"],
    });
    newIds.push(newRef.id);
  }

  if (newIds.length === 0) return [];
  await batch.commit();
  return newIds;
}
