import type { Metadata } from "next";
import Link from "next/link";
import { LogIn, Settings2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { HeaderNavLinks, MobileNavLinks } from "@/components/NavLinks";
import { UserMenu } from "@/components/UserMenu";
import "./globals.css";

export const metadata: Metadata = {
  title: "SubBoost Local - Clash 订阅转换与管理工具",
  description: "本地化部署的 Clash/Mihomo 订阅转换、配置生成和模板管理工具。",
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body>
        <div className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <Footer />
          <MobileNavLinks />
        </div>
      </body>
    </html>
  );
}

async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/45 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-none items-center justify-between px-4 sm:px-6 lg:px-12 2xl:px-24">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white shadow-glow">
            <Settings2 className="h-[18px] w-[18px]" />
          </div>
          <span className="hidden text-lg font-bold sm:inline">SubBoost Local</span>
        </Link>
        <HeaderNavLinks />
        {user ? (
          <UserMenu username={user.username} isAdmin={user.isAdmin} />
        ) : (
          <Link href="/login" className="btn btn-primary h-8 px-3 text-[12px]">
            <LogIn className="h-4 w-4" />
            登录
          </Link>
        )}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="hidden border-t border-white/10 bg-black/20 md:block">
      <div className="mx-auto grid max-w-none grid-cols-4 gap-8 px-4 py-8 text-[12px] text-white/55 sm:px-6 lg:px-12 2xl:px-24">
        <div>
          <div className="mb-3 font-semibold text-white">SubBoost Local</div>
          <p>Clash 订阅转换、生成和管理工具，让配置更简单。</p>
        </div>
        <div>
          <div className="mb-3 font-semibold text-white">功能</div>
          <Link className="block hover:text-white" href="/">配置生成器</Link>
          <Link className="block hover:text-white" href="/templates">模板库</Link>
        </div>
        <div>
          <div className="mb-3 font-semibold text-white">帮助</div>
          <Link className="block hover:text-white" href="/faq">常见问题</Link>
          <Link className="block hover:text-white" href="/terms">服务条款</Link>
        </div>
        <div>
          <div className="mb-3 font-semibold text-white">相关资源</div>
          <a className="block hover:text-white" href="https://github.com/MetaCubeX/mihomo" target="_blank">Mihomo Core</a>
          <a className="block hover:text-white" href="https://github.com/MetaCubeX/meta-rules-dat" target="_blank">规则库</a>
        </div>
      </div>
    </footer>
  );
}
