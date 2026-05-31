# Firestore Security Rules — 권한 매트릭스

`firestore.rules` 의 인가 모델 요약. 코드 변경 시 이 문서도 함께 업데이트.

## 약어

- **self** = `request.auth.uid == 대상 uid`
- **member(g)** = `auth.uid in groups/{g}.memberUids`
- **owner(g)** = `auth.uid == groups/{g}.ownerId`
- **anon** = 비로그인

## users/{uid}

| 작업 | self | 타 멤버 | 외부 | 비고 |
|------|:----:|:-------:|:----:|------|
| read | ✅ | ❌ | ❌ | 멤버 이름은 group doc 캐시로 노출 예정 |
| create | ✅ | ❌ | ❌ | 회원가입 시 signUp 헬퍼가 작성 |
| update | ✅ | ❌ | ❌ | doc id가 uid이므로 변경 불가 (자명) |
| delete | ✅ | ❌ | ❌ | 본인 탈퇴용 |

## groups/{groupId}

| 작업 | owner | 일반 멤버 | 비멤버 | 비고 |
|------|:-----:|:---------:|:------:|------|
| read | ✅ | ✅ | ❌ | |
| create | n/a | n/a | ✅\* | \*본인을 owner+단독 멤버로만 |
| update — 메타(name·inviteCode·ownerId 위임·강퇴) | ✅ | ❌ | ❌ | `ownerId in memberUids` 유지 |
| update — 본인 합류 | n/a | n/a | ✅\* | \*memberUids만 변경, +본인 한 명 |
| update — 본인 탈퇴 | ❌ | ✅\* | ❌ | \*방장은 위임 후 탈퇴, memberUids만 변경 |
| delete | ✅ | ❌ | ❌ | |

inviteCode 형식: `^[A-HJ-KM-NP-Z2-9]{6}$` (혼동문자 `0/O/1/I/L` 제외).

## inviteCodes/{code}

비멤버의 그룹 합류 lookup 전용. body: `{ groupId, ownerId, createdAt }`.

| 작업 | owner | 인증 사용자 | 비인증 | 비고 |
|------|:-----:|:-----------:|:------:|------|
| read | ✅ | ✅ | ❌ | 코드 자체가 비밀 |
| create | ✅\* | ❌ | ❌ | \*ownerId=본인 + 코드 형식 검증 |
| update | ❌ | ❌ | ❌ | 회전은 delete + create |
| delete | ✅ | ❌ | ❌ | |

⚠️ `ownerId`는 doc 생성 시점 owner. 방장 위임 후엔 stale. Day 7 그룹 설정에서 회전 로직과 함께 정비.

## chores/{choreId}

| 작업 | 멤버 | 비멤버 | 비고 |
|------|:----:|:------:|------|
| read | ✅ | ❌ | |
| create | ✅ | ❌ | mode ∈ {rotation, fixed}, 필드 타입 검증 |
| update | ✅ | ❌ | `groupId` 변경 금지 |
| delete | ✅ | ❌ | 방장 한정 X (그룹 멤버 누구나) |

## choreLog/{logId}

| 작업 | owner | 일반 멤버 | 비멤버 | 비고 |
|------|:-----:|:---------:|:------:|------|
| read | ✅ | ✅ | ❌ | |
| create | ✅ | ✅ | ❌ | `completedByActual == auth.uid`, `active == true` 강제 |
| update — 비활성화 (active true→false) | ✅ | ❌ | ❌ | `deactivateReason` 필수, 4필드만 변경 |
| update — 기타 | ❌ | ❌ | ❌ | 본문 수정 금지 |
| delete | ❌ | ❌ | ❌ | 영구 보존 |

## 클라이언트가 책임지는 검증 (Rules에서 안 막음)

비용·복잡도 절감 위해 **클라이언트 코드**가 책임지는 항목:

1. **순번제 차례 검증**: rotation chore 완료 시 `completedBy`가 `currentTurnIndex` 인덱스의 멤버인지. `allowProxyComplete=false`면 `completedBy == completedByActual` 강제.
2. **양방향 동기화**: `users.groupIds[]` ↔ `groups.memberUids[]` 일치. 배치 write로 트랜잭션 보장.
3. **`currentTurnIndex` 진행**: 완료 1회당 +1 modulo, 비활성화 시 −1.
4. **invite code 충돌**: 6자 random 생성 후 `where('inviteCode', '==', ...)` 조회로 충돌 시 재생성.

이 항목들은 Rules로 막을 수 있지만 `get()` 비용 + Rules 복잡도가 크다. 클라이언트가 1차로 보장하고, Rules는 멤버십·자격증명 위조만 차단한다.

## get() 비용

cross-collection 검증 (`isGroupMember(groupId)` 등)은 read 1회 비용 발생.

- chores read 1회 = chores doc 1 + groups doc 1 (멤버십 확인) = **2회 청구**
- choreLog read/write = choreLog 1 + groups 1 = **2회 청구**

데이터 폭증 시 비용 모니터링 필요.

## 테스트

`npm run test:rules` — emulator 기동 + Vitest. `tests/rules.test.ts` 19개 케이스.
