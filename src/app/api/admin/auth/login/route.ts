import { cookies } from "next/headers";
import { authCookieName, authCookieOptions, adminSessionMaxAgeSeconds } from "@/lib/auth";
import { createAuthSession, verifyAdminPassword } from "@/lib/db";
import { assertSameOrigin, sameOriginErrorResponse } from "@/lib/requestGuard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return sameOriginErrorResponse();
  }
  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
  const admin = body?.username && body?.password ? verifyAdminPassword(body.username, body.password) : null;
  if (!admin) {
    return Response.json({ error: "用户名或密码错误" }, { status: 401 });
  }
  const session = createAuthSession({ userId: admin.id, isAdmin: true, maxAgeSeconds: adminSessionMaxAgeSeconds });
  const cookieStore = await cookies();
  cookieStore.set(authCookieName, session.token, authCookieOptions(adminSessionMaxAgeSeconds));
  return Response.json({ ok: true, user: admin });
}
