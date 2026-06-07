"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2, Plus, RefreshCw, Shield, Trash2, UserPlus, Users } from "lucide-react";

type UserItem = {
  id: string;
  username: string;
  createdAt: string;
  updatedAt: string;
  role: string;
  kind: "admin" | "user";
  deletable: boolean;
};

export function UserManagementClient() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setNotice(data.error || "加载用户失败");
      return;
    }
    setUsers(data.users || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setNotice(data.error || "创建用户失败");
      return;
    }
    setUsername("");
    setPassword("");
    setNotice(`已创建用户：${data.user.username}`);
    await load();
  }

  async function remove(user: UserItem) {
    if (!user.deletable) return;
    if (!window.confirm(`确定删除用户 ${user.username} 吗？`)) return;
    const response = await fetch(`/api/admin/users?id=${encodeURIComponent(user.id)}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setNotice(data.error || "删除用户失败");
      return;
    }
    setNotice(`已删除用户：${user.username}`);
    await load();
  }

  async function updatePassword(user: UserItem) {
    const password = passwordDrafts[user.id] || "";
    if (!password) {
      setNotice("请输入新密码");
      return;
    }
    setUpdatingId(user.id);
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, password })
    });
    const data = await response.json();
    setUpdatingId(null);
    if (!response.ok) {
      setNotice(data.error || "修改密码失败");
      return;
    }
    setPasswordDrafts((current) => ({ ...current, [user.id]: "" }));
    setNotice(`已修改密码：${user.username}`);
    await load();
  }

  return (
    <section className="panel rounded-2xl p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-xl font-bold"><Users className="h-5 w-5 text-indigo-300" />用户管理</h2>
          <p className="mt-1 text-sm text-white/45">管理可登录订阅功能的注册用户。</p>
        </div>
        <button className="btn" onClick={load} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          刷新
        </button>
      </div>

      <form className="mb-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={create}>
        <input className="input" placeholder="用户名" value={username} onChange={(event) => setUsername(event.target.value)} />
        <input className="input" type="password" placeholder="初始密码" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="btn btn-primary min-w-32" disabled={saving || !username || !password}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          创建用户
        </button>
      </form>

      {notice && <div className="mb-4 rounded-lg border border-indigo-400/30 bg-indigo-400/10 p-3 text-sm text-indigo-100">{notice}</div>}

      <div className="overflow-hidden rounded-xl border border-white/10">
        <div className="grid grid-cols-[1fr_110px_180px_260px_90px] bg-white/[0.045] px-4 py-3 text-xs text-white/45">
          <span>用户名</span>
          <span>角色</span>
          <span>创建时间</span>
          <span>修改密码</span>
          <span className="text-right">操作</span>
        </div>
        {users.map((user) => (
          <div key={user.id} className="grid grid-cols-[1fr_110px_180px_260px_90px] items-center gap-3 border-t border-white/8 px-4 py-3 text-sm">
            <span className="font-medium text-white/85">{user.username}</span>
            <span className={user.kind === "admin" ? "inline-flex w-fit items-center gap-1 rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-1 text-xs text-amber-200" : "inline-flex w-fit items-center gap-1 rounded-full border border-blue-300/25 bg-blue-400/10 px-2 py-1 text-xs text-blue-200"}>
              {user.kind === "admin" ? <Shield className="h-3 w-3" /> : <Users className="h-3 w-3" />}
              {user.role}
            </span>
            <span className="text-xs text-white/45">{formatDate(user.createdAt)}</span>
            <div className="flex gap-2">
              <input
                className="input h-8 px-2 py-1 text-xs"
                type="password"
                placeholder="新密码"
                value={passwordDrafts[user.id] || ""}
                onChange={(event) => setPasswordDrafts((current) => ({ ...current, [user.id]: event.target.value }))}
              />
              <button className="btn h-8 shrink-0 px-2 text-xs" onClick={() => updatePassword(user)} disabled={updatingId === user.id}>
                {updatingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              </button>
            </div>
            {user.deletable ? (
              <button className="btn h-8 justify-self-end border-rose-400/30 bg-rose-500/10 px-2 text-rose-200" onClick={() => remove(user)}>
                <Trash2 className="h-4 w-4" />
              </button>
            ) : (
              <span className="justify-self-end text-xs text-white/35">不可删除</span>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <div className="p-8 text-center text-sm text-white/45">
            <Plus className="mx-auto mb-2 h-6 w-6" />
            暂无注册用户
          </div>
        )}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}
