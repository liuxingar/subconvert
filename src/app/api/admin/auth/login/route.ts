import { cookies } from "next/headers";
import { verifyAdminPassword } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
  const admin = body?.username && body?.password ? verifyAdminPassword(body.username, body.password) : null;
  if (!admin) {
    return Response.json({ error: "用户名或密码错误" }, { status: 401 });
  }
  const cookieStore = await cookies();
  cookieStore.set("subboost_admin", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  cookieStore.set("subboost_admin_user", admin.username, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12
  });
  return Response.json({ ok: true, user: admin });
}
