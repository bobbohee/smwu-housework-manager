import {
  arrayRemove,
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import {
  groupRef,
  groupsCol,
  inviteCodeRef,
  userRef,
} from "@/lib/firebase/collections";
import {
  generateInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} from "@/lib/group/invite-code";

const MAX_CODE_RETRIES = 5;

export class GroupError extends Error {}

export interface CreateGroupResult {
  groupId: string;
  inviteCode: string;
}

export async function createGroup(
  name: string,
  uid: string,
): Promise<CreateGroupResult> {
  const trimmed = name.trim();
  if (!trimmed) throw new GroupError("그룹 이름을 입력해주세요.");

  const db = getDb();

  for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
    const code = generateInviteCode();
    const existing = await getDoc(inviteCodeRef(code));
    if (existing.exists()) continue;

    const newGroupRef = doc(groupsCol());
    const batch = writeBatch(db);

    batch.set(newGroupRef, {
      id: newGroupRef.id,
      name: trimmed,
      inviteCode: code,
      ownerId: uid,
      memberUids: [uid],
      createdAt: serverTimestamp(),
    });

    batch.set(inviteCodeRef(code), {
      code,
      groupId: newGroupRef.id,
      ownerId: uid,
      createdAt: serverTimestamp(),
    });

    batch.update(userRef(uid), {
      groupIds: arrayUnion(newGroupRef.id),
    });

    await batch.commit();
    return { groupId: newGroupRef.id, inviteCode: code };
  }

  throw new GroupError("초대 코드 생성 실패. 잠시 후 다시 시도해주세요.");
}

export async function joinGroup(
  rawCode: string,
  uid: string,
): Promise<string> {
  const code = normalizeInviteCode(rawCode);
  if (!isValidInviteCode(code)) {
    throw new GroupError("올바른 초대 코드 형식이 아닙니다.");
  }

  const db = getDb();
  const inviteSnap = await getDoc(inviteCodeRef(code));
  if (!inviteSnap.exists()) {
    throw new GroupError("존재하지 않는 초대 코드입니다.");
  }

  const { groupId } = inviteSnap.data();

  const batch = writeBatch(db);
  batch.update(groupRef(groupId), { memberUids: arrayUnion(uid) });
  batch.update(userRef(uid), { groupIds: arrayUnion(groupId) });
  await batch.commit();

  return groupId;
}

export async function updateGroupName(
  groupId: string,
  newName: string,
): Promise<void> {
  const trimmed = newName.trim();
  if (!trimmed) throw new GroupError("그룹 이름을 입력해주세요.");
  if (trimmed.length > 20) {
    throw new GroupError("그룹 이름은 20자 이내로 입력해주세요.");
  }
  await updateDoc(groupRef(groupId), { name: trimmed });
}

export async function transferOwnership(
  groupId: string,
  newOwnerUid: string,
): Promise<void> {
  // Rules: 방장 update 분기는 ownerId가 memberUids에 있어야 통과.
  // newOwnerUid가 memberUids에 존재한다는 사전 검증은 클라이언트가 확인 (UI에서 멤버 목록만 표시).
  await updateDoc(groupRef(groupId), { ownerId: newOwnerUid });
}

export async function kickMember(
  groupId: string,
  memberUid: string,
  ownerUid: string,
): Promise<void> {
  if (memberUid === ownerUid) {
    throw new GroupError("방장은 강퇴할 수 없습니다.");
  }
  // Rules 방장 분기로 memberUids 변경 가능. 단 user 본인의 groupIds는 self만 수정 가능 →
  // 강퇴된 사용자 doc의 groupIds는 자가 정리 hook(stale id 청소)이 처리.
  await updateDoc(groupRef(groupId), {
    memberUids: arrayRemove(memberUid),
  });
}

export async function leaveGroup(
  groupId: string,
  uid: string,
  isOwner: boolean,
): Promise<void> {
  if (isOwner) {
    throw new GroupError("방장은 다른 멤버에게 위임 후 나갈 수 있습니다.");
  }
  const db = getDb();
  const batch = writeBatch(db);
  batch.update(groupRef(groupId), { memberUids: arrayRemove(uid) });
  batch.update(userRef(uid), { groupIds: arrayRemove(groupId) });
  await batch.commit();
}
