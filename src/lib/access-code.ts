import { timingSafeEqual } from "node:crypto";

export function getRegisterAccessCode() {
  return (process.env.REGISTER_ACCESS_CODE || "").trim();
}

export function verifyAccessCode(input: string) {
  const expected = getRegisterAccessCode();
  const received = input.trim();
  if (!expected) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function requireAccessCode(input: string | undefined) {
  if (!getRegisterAccessCode()) {
    return { ok: false as const, message: "REGISTER_ACCESS_CODE chưa được cấu hình trên server.", status: 503 };
  }
  if (!input || !verifyAccessCode(input)) {
    return { ok: false as const, message: "Access code không đúng.", status: 403 };
  }
  return { ok: true as const };
}
