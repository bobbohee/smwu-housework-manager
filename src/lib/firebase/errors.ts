import { FirebaseError } from "firebase/app";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "이미 가입된 이메일입니다.",
  "auth/invalid-email": "올바른 이메일 형식이 아닙니다.",
  "auth/weak-password": "비밀번호는 6자 이상이어야 합니다.",
  "auth/user-not-found": "등록되지 않은 계정입니다.",
  "auth/wrong-password": "비밀번호가 일치하지 않습니다.",
  "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "auth/too-many-requests": "잠시 후 다시 시도해주세요.",
  "auth/network-request-failed": "네트워크 연결을 확인해주세요.",
  "auth/missing-password": "비밀번호를 입력해주세요.",
  "auth/missing-email": "이메일을 입력해주세요.",
  "auth/user-disabled": "비활성화된 계정입니다.",
  "auth/operation-not-allowed": "지원하지 않는 인증 방식입니다.",
};

export function mapAuthError(err: unknown): string {
  if (err instanceof FirebaseError) {
    return AUTH_ERROR_MESSAGES[err.code] ?? `오류가 발생했습니다 (${err.code})`;
  }
  if (err instanceof Error) return err.message;
  return "알 수 없는 오류가 발생했습니다.";
}
