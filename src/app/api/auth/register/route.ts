import { cookies } from "next/headers";
import { authCookieName, authCookieOptions, userSessionMaxAgeSeconds } from "@/lib/auth";
import { createAuthSession, createUser } from "@/lib/db";
import { assertSameOrigin, sameOriginErrorResponse } from "@/lib/requestGuard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return sameOriginErrorResponse();
  }
  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
  try {
    const username = body?.username?.trim() || "";
    const password = body?.password || "";
    const user = createUser({ username, password });
    const session = createAuthSession({ userId: user.id, isAdmin: false, maxAgeSeconds: userSessionMaxAgeSeconds });
    const cookieStore = await cookies();
    cookieStore.set(authCookieName, session.token, authCookieOptions(userSessionMaxAgeSeconds));
    return Response.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "注册失败";
    const status = message.includes("UNIQUE") ? 409 : 400;
    return Response.json({ error: message.includes("UNIQUE") ? "用户名已存在" : message }, { status });
  }
}
