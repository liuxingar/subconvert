import Link from "next/link";
import { DashboardClient } from "@/components/DashboardClient";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="panel rounded-2xl p-6">
          <h1 className="text-xl font-semibold">需要登录</h1>
          <p className="mt-2 text-white/55">请先登录后管理订阅链接。</p>
          <Link className="btn btn-primary mt-5" href="/login">去登录</Link>
        </div>
      </div>
    );
  }
  return <DashboardClient />;
}
