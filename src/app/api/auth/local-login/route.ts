import { cookies } from "next/headers";
import { authCookieName, authCookieOptions, userSessionMaxAgeSeconds } from "@/lib/auth";
import { createAuthSession, verifyUserPassword } from "@/lib/db";
import { assertSameOrigin, sameOriginErrorResponse } from "@/lib/requestGuard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return sameOriginErrorResponse();
  }
  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
  const username = body?.username?.trim();
  if (!username || !body?.password) {
    return Response.json({ error: "请输入用户名和密码" }, { status: 400 });
  }
  const user = verifyUserPassword(username, body.password);
  if (!user) {
    return Response.json({ error: "用户名或密码错误" }, { status: 401 });
  }
  const session = createAuthSession({ userId: user.id, isAdmin: false, maxAgeSeconds: userSessionMaxAgeSeconds });
  const cookieStore = await cookies();
  cookieStore.set(authCookieName, session.token, authCookieOptions(userSessionMaxAgeSeconds));
  return Response.json({ ok: true, user });
}
