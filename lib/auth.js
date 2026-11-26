// Password login: one password (DASHBOARD_PASSWORD), a signed httpOnly cookie for 30 days. Server-only.
import crypto from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE = "tb_session";
export const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET is not set (16+ characters)");
  return s;
}

// The token changes if the password or secret changes, so changing either logs every device out.
export function token() {
  return crypto.createHmac("sha256", secret()).update("tb-ok:" + (process.env.DASHBOARD_PASSWORD || "")).digest("hex");
}

function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function passwordOk(given) {
  const real = process.env.DASHBOARD_PASSWORD;
  if (!real) return false;                      // no password configured = nobody gets in
  const h = (v) => crypto.createHash("sha256").update(String(v)).digest();
  return crypto.timingSafeEqual(h(given), h(real));
}

export async function loggedIn() {
  const c = (await cookies()).get(COOKIE)?.value;
  try {
    return !!c && same(c, token());
  } catch {
    return false;
  }
}
