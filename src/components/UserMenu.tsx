"use client";

import { useState } from "react";
import { LogOut, Shield, UserCircle } from "lucide-react";

export function UserMenu({ username, isAdmin }: { username: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="relative">
      <button
        className="inline-flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-3 text-[13px] text-white/78 hover:border-indigo-300/40 hover:bg-white/[0.08]"
        onClick={() => setOpen((value) => !value)}
      >
        {isAdmin ? <Shield className="h-4 w-4 text-amber-200" /> : <UserCircle className="h-4 w-4 text-indigo-200" />}
        <span className="max-w-32 truncate">{username}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-44 rounded-xl border border-white/10 bg-[#111119] p-2 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <div className="px-3 py-2 text-xs text-white/45">{isAdmin ? "管理员账号" : "注册用户"}</div>
          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/78 hover:bg-white/8 hover:text-white" onClick={logout}>
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
