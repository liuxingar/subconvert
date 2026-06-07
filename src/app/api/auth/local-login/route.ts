import { cookies } from "next/headers";
import { verifyUserPassword } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
  const username = body?.username?.trim();
  if (!username || !body?.password) {
    return Response.json({ error: "请输入用户名和密码" }, { status: 400 });
  }
  const user = verifyUserPassword(username, body.password);
  if (!user) {
    return Response.json({ error: "用户名或密码错误" }, { status: 401 });
  }
  const cookieStore = await cookies();
  cookieStore.set("subboost_user", user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return Response.json({ ok: true, user });
}
