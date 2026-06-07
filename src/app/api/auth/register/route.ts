import { cookies } from "next/headers";
import { createUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
  try {
    const username = body?.username?.trim() || "";
    const password = body?.password || "";
    const user = createUser({ username, password });
    const cookieStore = await cookies();
    cookieStore.set("subboost_user", user.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    return Response.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "注册失败";
    const status = message.includes("UNIQUE") ? 409 : 400;
    return Response.json({ error: message.includes("UNIQUE") ? "用户名已存在" : message }, { status });
  }
}
