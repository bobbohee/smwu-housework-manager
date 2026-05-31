import {
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
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
