// 영문 대문자 + 숫자 31자 (혼동문자 0/O·1/I/L 제외).
// firestore.rules의 정규식 `^[A-HJ-KM-NP-Z2-9]{6}$` 와 일치.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(): string {
  const arr = new Uint32Array(6);
  crypto.getRandomValues(arr);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[arr[i] % ALPHABET.length];
  }
  return code;
}

const CODE_REGEX = /^[A-HJ-KM-NP-Z2-9]{6}$/;

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidInviteCode(code: string): boolean {
  return CODE_REGEX.test(code);
}
