"use client";

import { useState } from "react";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoginClient() {
  const [agreed, setAgreed] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [showAdmin, setShowAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localUsername, setLocalUsername] = useState("local");
  const [localPassword, setLocalPassword] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submitUser(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const endpoint = authMode === "login" ? "/api/auth/local-login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: localUsername, password: localPassword })
      });
      const data = await readJsonResponse(response);
      if (!response.ok) {
        setError(data.error || (authMode === "login" ? "登录失败" : "注册失败"));
        return;
      }
      window.location.href = getSafeNextPath(new URLSearchParams(window.location.search).get("next"));
    } catch (error) {
      setError(error instanceof Error ? error.message : "登录请求失败，请检查服务是否正常运行");
    }
  }

  async function submitAdmin(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await readJsonResponse(response);
      if (!response.ok) {
        setError(data.error || "登录失败");
        return;
      }
      window.location.href = "/admin";
    } catch (error) {
      setError(error instanceof Error ? error.message : "管理员登录请求失败，请检查服务是否正常运行");
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500 text-xl font-black shadow-glow">SB</div>
          <h1 className="mt-4 text-2xl font-bold">欢迎使用 SubBoost</h1>
          <p className="mt-2 text-white/50">登录或注册后管理订阅链接</p>
        </div>
        <div className="panel rounded-2xl p-6">
          <div className="mb-4 grid grid-cols-2 rounded-lg border border-white/10 bg-white/[0.04] p-1">
            <button className={authTabClass(authMode === "login")} onClick={() => setAuthMode("login")}>用户登录</button>
            <button className={authTabClass(authMode === "register")} onClick={() => setAuthMode("register")}><UserPlus className="h-4 w-4" />用户注册</button>
          </div>

          <form className="mb-5 space-y-3" onSubmit={submitUser}>
            <div className="text-sm font-medium text-white/70">{authMode === "login" ? "注册用户登录" : "创建注册用户"}</div>
            <p className="text-xs leading-relaxed text-white/45">
              {authMode === "login" ? "默认已初始化 local 用户，密码由 LOCAL_USER_PASSWORD 环境变量配置。也可以使用新注册的用户登录。" : "用户名支持 3-32 位字母、数字、下划线或短横线，密码至少 4 位。"}
            </p>
            <input className="input" placeholder="用户名" value={localUsername} onChange={(event) => setLocalUsername(event.target.value)} />
            <input className="input" type="password" placeholder="密码" value={localPassword} onChange={(event) => setLocalPassword(event.target.value)} />
            <button className="btn btn-primary w-full" disabled={!agreed || !localUsername || !localPassword}>
              {authMode === "login" ? "登录到订阅管理" : "注册并登录"}
            </button>
          </form>

          {error && <p className="mb-3 text-sm text-red-300">{error}</p>}
          <div className="relative my-4 border-t border-white/10 text-center">
            <button type="button" className="relative -top-3 bg-[#141422] px-3 text-xs text-white/45 hover:text-white" onClick={() => setShowAdmin((value) => !value)}>
              {showAdmin ? "收起管理员登录" : "管理员登录"}
            </button>
          </div>
          {showAdmin && (
            <form className="space-y-3" onSubmit={submitAdmin}>
              <input className="input" placeholder="管理员账号" value={username} onChange={(event) => setUsername(event.target.value)} />
              <div className="relative">
                <input className="input pr-12" type={showPassword ? "text" : "password"} placeholder="密码" value={password} onChange={(event) => setPassword(event.target.value)} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <button className="btn btn-primary w-full" disabled={!username || !password}>管理员登录</button>
            </form>
          )}
        </div>
        <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 text-sm text-white/45">
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
          我已阅读并同意 <a href="/terms" className="text-indigo-200">服务条款与免责声明</a>
        </label>
      </div>
    </div>
  );
}

function authTabClass(active: boolean) {
  return cn("inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-[13px] transition", active ? "bg-indigo-500/70 text-white" : "text-white/55 hover:bg-white/8 hover:text-white");
}

function getSafeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { error?: string };
  } catch {
    if (!response.ok) throw new Error(`服务返回异常响应（HTTP ${response.status}）`);
    throw new Error("服务返回格式异常");
  }
}
