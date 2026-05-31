# 우리집 살림 매니저 (SMWU Housework Manager)

공동 거주 구성원의 집안일 당번·완료 기록을 관리하는 웹앱.
숙명여대 웹시스템설계 기말 프로젝트.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js 16 (App Router) + React 19 |
| 스타일 | Tailwind CSS 4 |
| 인증 | Firebase Auth |
| DB | Firebase Firestore |
| 배포 | Vercel |

## 로컬 셋업

1. 저장소 클론 후 의존성 설치
   ```bash
   npm install
   ```

2. Firebase 환경변수 설정
   ```bash
   cp .env.local.example .env.local
   ```
   Firebase Console → 프로젝트 설정 → 내 앱 → SDK 설정 및 구성에서 값 복사.

3. 개발 서버 실행
   ```bash
   npm run dev
   ```
   http://localhost:3000

## 문서

- `docs/superpowers/specs/2026-03-31-house-chore-manager-design.md` — 단일 진실 공급원 (SSOT)
- `docs/superpowers/wireframes/wireframe-interactive.html` — 확정 와이어프레임
- `CLAUDE.md` — Claude Code 작업 가이드

## 개발 일정

| 주차 | 단계 |
|------|------|
| 1주차 | 기반 셋업 + 인증·그룹 |
| 2주차 | 집안일 CRUD + 캘린더 |
| 3주차 | 통계·꽝뽑기 + 배포 |
