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
