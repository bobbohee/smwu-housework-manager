# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 상태

**설계 단계** — 아직 구현 코드가 없다. Git 저장소도 초기화되어 있지 않다.
현재 존재하는 것은 설계 산출물뿐이다:

- `docs/superpowers/specs/2026-03-31-house-chore-manager-design.md` — **단일 진실 공급원(SSOT)**. 기능, 데이터 모델, 페이지 구성이 모두 여기 정의됨. 구현 전 반드시 읽을 것.
- `docs/superpowers/wireframes/wireframe-interactive.html` — 확정된 인터랙티브 와이어프레임. 사이드바(PC) + 하단 탭(모바일) 네비게이션 구조.
- `.superpowers/brainstorm/` — 브레인스토밍 과정의 와이어프레임 후보들(작업용, 참고만).

구현을 시작하면 아래 "예정 기술 스택"에 맞춰 빌드/테스트 명령을 이 파일에 추가할 것.

## 예정 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React + Next.js (App Router) |
| 백엔드 | Next.js API Routes — 서버 검증이 꼭 필요한 경우에만 |
| 인증 | Firebase Auth (이메일/비밀번호) |
| DB | Firebase Firestore |

**아키텍처 원칙**: 프론트엔드 중심. 클라이언트가 Firestore SDK로 직접 읽기/쓰기하고, 접근 권한은 Firestore Security Rules로 제어한다. API Route는 최소화.

## 데이터 모델 (Firestore 4개 컬렉션)

`users`, `groups`, `chores`, `choreLog`. 전체 스키마는 스펙 문서 "데이터 구조" 절 참조. 여러 화면에 걸쳐 적용되는 핵심 관계와 불변식:

- **다대다 그룹 멤버십**: `users.groupIds[]` ↔ `groups.memberUids[]` 를 양방향으로 동기화해야 한다. 한 계정이 여러 그룹 소속 가능. 홈 상단에서 그룹 전환.
- **순번제(rotation) chore**: `rotationOrder[]`(참여 멤버 + 순서) + `currentTurnIndex`로 현재 차례를 관리. 참여 멤버를 chore별로 다르게 설정 가능(전체 그룹 멤버 ≠ 참여 멤버). `allowProxyComplete`(기본 false)로 대신 완료 허용 여부 제어.
- **프리셋은 복사본**: 그룹 생성 시 범용 프리셋을 선택하면 chores에 복사본으로 생성된다(참조 아님). 그룹별 자유 수정/삭제 가능. 앱에 가정-특화 하드코딩 값 없음.
- **고정제(fixed) chore**: `fixedSchedule[]`로 담당자별 일정 지정. `type: "weekly"`(요일) 또는 `type: "interval"`(N일 주기 + startDate). **완료 기록을 남기지 않으며** 홈에서 알림만 표시. 캘린더/통계 집계 대상이 아님.

## 핵심 비즈니스 로직 불변식

구현 시 반드시 지켜야 하는, 여러 기능에 얽힌 규칙:

1. **순번 진행**: 순번제 chore 완료 시 `choreLog`에 기록 + `currentTurnIndex = (currentTurnIndex + 1) % rotationOrder.length`. 완료 버튼 1회 = 차례 1회 소진.
1-1. **완료 권한 & 귀속 분리**: 기본은 현재 차례 멤버만 완료 버튼 활성. `allowProxyComplete: true`면 참여 멤버 누구나 대신 완료. choreLog는 `completedBy`(차례·통계 귀속)와 `completedByActual`(실제 누른 사람)을 분리 기록 — 통계는 `completedBy` 기준.
2. **완료 내역 비활성화 → 차례 복원**: 방장이 `choreLog` 항목을 비활성화(`active: false`)하면, 그 항목이 순번제(`type: "rotation"`)인 경우 **`currentTurnIndex`를 되돌려야** 한다(차례 복원). 비활성화는 사유(`deactivateReason`) 입력 필수, 레코드는 삭제하지 않고 보존.
3. **통계 집계는 `active: true`만**: 멤버별/집안일별 완료 횟수는 비활성화 항목을 제외. 단 **캘린더 뷰는 비활성화 항목도 표시**하되 구분 가능하게.
4. **꽝뽑기 결과**: 랜덤 배정 결과는 `choreLog`에 `type: "random"`으로 기록(순번제 완료와 구분).
5. **완료 규칙(`chores.rules`)**: 참고용 표시일 뿐, 앱이 강제 체크하지 않는다.
6. **권한**: 방장(owner)만 멤버 강퇴 / 완료 내역 비활성화 / 방장 위임 가능.

## 페이지 / 네비게이션

7개 페이지: 로그인·회원가입 / 홈(대시보드) / 캘린더 / 집안일 관리 / 꽝뽑기 / 통계 / 그룹 설정.
하단 탭(모바일) 또는 사이드바(PC)에서 홈·캘린더·꽝뽑기·통계·설정에 직접 접근 — 모든 기능 2~3클릭 내 도달이 설계 목표.
