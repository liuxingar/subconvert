import { cookies } from "next/headers";
import { createUser, deleteUser, listAdminUsers, listUsers, updateAdminPassword, updateUserPassword } from "@/lib/db";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const cookieStore = await cookies();
  if (cookieStore.get("subboost_admin")?.value !== "1") throw new Error("UNAUTHORIZED");
}

export async function GET() {
  try {
    await requireAdmin();
    return Response.json({
      users: [
        ...listAdminUsers().map((user) => ({ ...user, id: `admin:${user.id}`, role: "管理员", kind: "admin", deletable: false })),
        ...listUsers().map((user) => ({ ...user, role: "用户", kind: "user", deletable: true }))
      ]
    });
  } catch {
    return Response.json({ error: "需要管理员权限" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
    const user = createUser({ username: body?.username || "", password: body?.password || "" });
    return Response.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建用户失败";
    const status = message === "UNAUTHORIZED" ? 401 : message.includes("UNIQUE") ? 409 : 400;
    return Response.json({ error: message.includes("UNIQUE") ? "用户名已存在" : message }, { status });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "缺少用户 ID" }, { status: 400 });
    if (id.startsWith("admin:")) return Response.json({ error: "管理员账号不支持删除" }, { status: 400 });
    deleteUser(id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "需要管理员权限" }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json().catch(() => null)) as { id?: string; password?: string } | null;
    if (!body?.id || !body.password) return Response.json({ error: "缺少用户 ID 或密码" }, { status: 400 });
    const user = body.id.startsWith("admin:")
      ? updateAdminPassword(body.id.slice("admin:".length), body.password)
      : updateUserPassword(body.id, body.password);
    if (!user) return Response.json({ error: "用户不存在" }, { status: 404 });
    return Response.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "修改密码失败";
    return Response.json({ error: message }, { status: message === "UNAUTHORIZED" ? 401 : 400 });
  }
}
