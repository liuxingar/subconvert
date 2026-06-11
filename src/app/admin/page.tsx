import Link from "next/link";
import { UserManagementClient } from "@/components/UserManagementClient";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="panel rounded-2xl p-6">
          <div className="text-lg font-semibold">访问受限</div>
          <div className="mt-2 text-white/60">您需要管理员权限才能访问此页面。</div>
          <Link className="btn btn-primary mt-5" href="/login">去登录</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">管理后台</h1>
        <p className="mt-2 text-sm text-white/45">本地版目前提供注册用户管理。</p>
      </div>
      <UserManagementClient />
    </div>
  );
}
