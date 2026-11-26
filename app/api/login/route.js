import { NextResponse } from "next/server";
import { COOKIE, MAX_AGE, passwordOk, token } from "../../../lib/auth";

export async function POST(request) {
  const form = await request.formData();
  const url = new URL("/", request.url);
  if (!passwordOk(form.get("password") || "")) {
    await new Promise((r) => setTimeout(r, 1500));          // slows down guessing
    url.searchParams.set("e", "1");
    return NextResponse.redirect(url, 303);
  }
  const res = NextResponse.redirect(url, 303);
  res.cookies.set(COOKIE, token(), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: MAX_AGE });
  return res;
}
