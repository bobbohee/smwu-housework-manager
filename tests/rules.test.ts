import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-housework-rules",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

function aliceDb() {
  return env.authenticatedContext("alice").firestore();
}

function bobDb() {
  return env.authenticatedContext("bob").firestore();
}

function anonDb() {
  return env.unauthenticatedContext().firestore();
}

async function seedGroup(opts: {
  id: string;
  ownerId: string;
  memberUids: string[];
  inviteCode?: string;
}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "groups", opts.id), {
      name: "test-group",
      ownerId: opts.ownerId,
      memberUids: opts.memberUids,
      inviteCode: opts.inviteCode ?? "ABCD23",
      createdAt: new Date(),
    });
  });
}

async function seedChore(id: string, groupId: string) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "chores", id), {
      groupId,
      name: "설거지",
      mode: "rotation",
      color: "#4A90D9",
      rotationOrder: ["alice", "bob"],
      currentTurnIndex: 0,
      allowProxyComplete: false,
      fixedSchedule: [],
      rules: [],
      createdAt: new Date(),
    });
  });
}

describe("users", () => {
  it("본인 doc read 성공", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", "alice"), {
        uid: "alice",
        name: "Alice",
        email: "a@a.com",
        groupIds: [],
        createdAt: new Date(),
      });
    });
    await assertSucceeds(getDoc(doc(aliceDb(), "users", "alice")));
  });

  it("타인 doc read 거부", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", "bob"), {
        uid: "bob",
        name: "Bob",
        email: "b@b.com",
        groupIds: [],
        createdAt: new Date(),
      });
    });
    await assertFails(getDoc(doc(aliceDb(), "users", "bob")));
  });
});

describe("groups", () => {
  it("본인이 owner+단독멤버로 create 성공", async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb(), "groups", "g1"), {
        name: "우리집",
        ownerId: "alice",
        memberUids: ["alice"],
        inviteCode: "ABCD23",
        createdAt: new Date(),
      }),
    );
  });

  it("ownerId 위조한 create 거부", async () => {
    await assertFails(
      setDoc(doc(aliceDb(), "groups", "g1"), {
        name: "우리집",
        ownerId: "bob",
        memberUids: ["bob"],
        inviteCode: "ABCD23",
        createdAt: new Date(),
      }),
    );
  });

  it("inviteCode 형식 위반 시 create 거부 (혼동문자 포함)", async () => {
    await assertFails(
      setDoc(doc(aliceDb(), "groups", "g1"), {
        name: "우리집",
        ownerId: "alice",
        memberUids: ["alice"],
        inviteCode: "ABCD0L", // 0, L 포함
        createdAt: new Date(),
      }),
    );
  });

  it("멤버 read 성공", async () => {
    await seedGroup({ id: "g1", ownerId: "alice", memberUids: ["alice"] });
    await assertSucceeds(getDoc(doc(aliceDb(), "groups", "g1")));
  });

  it("비멤버 read 거부", async () => {
    await seedGroup({ id: "g1", ownerId: "alice", memberUids: ["alice"] });
    await assertFails(getDoc(doc(bobDb(), "groups", "g1")));
  });

  it("본인 합류 update 성공", async () => {
    await seedGroup({ id: "g1", ownerId: "alice", memberUids: ["alice"] });
    await assertSucceeds(
      updateDoc(doc(bobDb(), "groups", "g1"), {
        memberUids: ["alice", "bob"],
      }),
    );
  });

  it("타인 합류시 본인을 추가하지 않으면 거부", async () => {
    await seedGroup({ id: "g1", ownerId: "alice", memberUids: ["alice"] });
    await assertFails(
      updateDoc(doc(bobDb(), "groups", "g1"), {
        memberUids: ["alice", "charlie"],
      }),
    );
  });

  it("방장 탈퇴 거부 (위임 필요)", async () => {
    await seedGroup({
      id: "g1",
      ownerId: "alice",
      memberUids: ["alice", "bob"],
    });
    await assertFails(
      updateDoc(doc(aliceDb(), "groups", "g1"), {
        memberUids: ["bob"],
      }),
    );
  });

  it("일반 멤버 탈퇴 성공", async () => {
    await seedGroup({
      id: "g1",
      ownerId: "alice",
      memberUids: ["alice", "bob"],
    });
    await assertSucceeds(
      updateDoc(doc(bobDb(), "groups", "g1"), {
        memberUids: ["alice"],
      }),
    );
  });

  it("본인 memberNames self-heal 성공", async () => {
    await seedGroup({
      id: "g1",
      ownerId: "alice",
      memberUids: ["alice", "bob"],
    });
    await assertSucceeds(
      updateDoc(doc(bobDb(), "groups", "g1"), {
        "memberNames.bob": "Bob",
      }),
    );
  });

  it("타인 memberNames 수정 거부", async () => {
    await seedGroup({
      id: "g1",
      ownerId: "alice",
      memberUids: ["alice", "bob"],
    });
    await assertFails(
      updateDoc(doc(bobDb(), "groups", "g1"), {
        "memberNames.alice": "Evil",
      }),
    );
  });

  it("빈 이름으로 memberNames self-heal 거부", async () => {
    await seedGroup({
      id: "g1",
      ownerId: "alice",
      memberUids: ["alice", "bob"],
    });
    await assertFails(
      updateDoc(doc(bobDb(), "groups", "g1"), {
        "memberNames.bob": "",
      }),
    );
  });
});

describe("chores", () => {
  it("멤버 chore create 성공", async () => {
    await seedGroup({
      id: "g1",
      ownerId: "alice",
      memberUids: ["alice", "bob"],
    });
    await assertSucceeds(
      setDoc(doc(bobDb(), "chores", "c1"), {
        groupId: "g1",
        name: "설거지",
        mode: "rotation",
        color: "#4A90D9",
        rotationOrder: ["alice", "bob"],
        currentTurnIndex: 0,
        allowProxyComplete: false,
        fixedSchedule: [],
        rules: [],
        createdAt: new Date(),
      }),
    );
  });

  it("비멤버 chore create 거부", async () => {
    await seedGroup({ id: "g1", ownerId: "alice", memberUids: ["alice"] });
    await assertFails(
      setDoc(doc(bobDb(), "chores", "c1"), {
        groupId: "g1",
        name: "설거지",
        mode: "rotation",
        color: "#4A90D9",
        rotationOrder: ["alice"],
        currentTurnIndex: 0,
        allowProxyComplete: false,
        fixedSchedule: [],
        rules: [],
        createdAt: new Date(),
      }),
    );
  });
});

describe("choreLog", () => {
  const baseLog = (overrides: Record<string, unknown> = {}) => ({
    choreId: "c1",
    groupId: "g1",
    completedBy: "alice",
    completedByActual: "alice",
    completedAt: new Date(),
    active: true,
    ...overrides,
  });

  it("본인이 completedByActual로 create 성공", async () => {
    await seedGroup({
      id: "g1",
      ownerId: "alice",
      memberUids: ["alice", "bob"],
    });
    await seedChore("c1", "g1");
    await assertSucceeds(setDoc(doc(aliceDb(), "choreLog", "l1"), baseLog()));
  });

  it("completedByActual 타인 위조 거부", async () => {
    await seedGroup({
      id: "g1",
      ownerId: "alice",
      memberUids: ["alice", "bob"],
    });
    await seedChore("c1", "g1");
    await assertFails(
      setDoc(
        doc(bobDb(), "choreLog", "l1"),
        baseLog({ completedByActual: "alice" }),
      ),
    );
  });

  it("delete 항상 거부", async () => {
    await seedGroup({
      id: "g1",
      ownerId: "alice",
      memberUids: ["alice"],
    });
    await seedChore("c1", "g1");
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "choreLog", "l1"), baseLog());
    });
    await assertFails(deleteDoc(doc(aliceDb(), "choreLog", "l1")));
  });

  it("방장 비활성화 update 성공", async () => {
    await seedGroup({
      id: "g1",
      ownerId: "alice",
      memberUids: ["alice", "bob"],
    });
    await seedChore("c1", "g1");
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), "choreLog", "l1"),
        baseLog({ completedBy: "bob", completedByActual: "bob" }),
      );
    });
    await assertSucceeds(
      updateDoc(doc(aliceDb(), "choreLog", "l1"), {
        active: false,
        deactivateReason: "쓰레기 잘못 분류",
        deactivatedBy: "alice",
        deactivatedAt: new Date(),
      }),
    );
  });

  it("일반 멤버 비활성화 거부", async () => {
    await seedGroup({
      id: "g1",
      ownerId: "alice",
      memberUids: ["alice", "bob"],
    });
    await seedChore("c1", "g1");
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "choreLog", "l1"), baseLog());
    });
    await assertFails(
      updateDoc(doc(bobDb(), "choreLog", "l1"), {
        active: false,
        deactivateReason: "마음에 안 듦",
        deactivatedBy: "bob",
        deactivatedAt: new Date(),
      }),
    );
  });
});

describe("inviteCodes", () => {
  it("인증 사용자 read 성공 (코드 lookup)", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "inviteCodes", "ABCD23"), {
        groupId: "g1",
        ownerId: "alice",
        createdAt: new Date(),
      });
    });
    await assertSucceeds(getDoc(doc(bobDb(), "inviteCodes", "ABCD23")));
  });

  it("미인증 사용자 read 거부", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "inviteCodes", "ABCD23"), {
        groupId: "g1",
        ownerId: "alice",
        createdAt: new Date(),
      });
    });
    await assertFails(getDoc(doc(anonDb(), "inviteCodes", "ABCD23")));
  });

  it("본인 ownerId로 create 성공", async () => {
    await assertSucceeds(
      setDoc(doc(aliceDb(), "inviteCodes", "ABCD23"), {
        groupId: "g1",
        ownerId: "alice",
        createdAt: new Date(),
      }),
    );
  });

  it("ownerId 위조 create 거부", async () => {
    await assertFails(
      setDoc(doc(aliceDb(), "inviteCodes", "ABCD23"), {
        groupId: "g1",
        ownerId: "bob",
        createdAt: new Date(),
      }),
    );
  });

  it("코드 형식 위반 create 거부", async () => {
    await assertFails(
      setDoc(doc(aliceDb(), "inviteCodes", "ABCD0L"), {
        groupId: "g1",
        ownerId: "alice",
        createdAt: new Date(),
      }),
    );
  });

  it("owner delete 성공", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "inviteCodes", "ABCD23"), {
        groupId: "g1",
        ownerId: "alice",
        createdAt: new Date(),
      });
    });
    await assertSucceeds(deleteDoc(doc(aliceDb(), "inviteCodes", "ABCD23")));
  });

  it("타인 delete 거부", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "inviteCodes", "ABCD23"), {
        groupId: "g1",
        ownerId: "alice",
        createdAt: new Date(),
      });
    });
    await assertFails(deleteDoc(doc(bobDb(), "inviteCodes", "ABCD23")));
  });

  it("update 영구 거부", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "inviteCodes", "ABCD23"), {
        groupId: "g1",
        ownerId: "alice",
        createdAt: new Date(),
      });
    });
    await assertFails(
      updateDoc(doc(aliceDb(), "inviteCodes", "ABCD23"), { groupId: "g2" }),
    );
  });
});

describe("misc", () => {
  it("미인증 사용자 모든 접근 거부", async () => {
    await assertFails(getDoc(doc(anonDb(), "users", "alice")));
  });
});
