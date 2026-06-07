import Link from "next/link";
import { listTemplates } from "@/lib/db";
import { formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const params = await searchParams;
  const q = params.q || "";
  const type = params.type === "plaza" ? "plaza" : "default";
  const templates = listTemplates(type, q);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">模板库</h1>
        <p className="mt-2 text-white/50">默认模板 / 模板广场</p>
      </div>
      <form className="panel mb-5 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row">
        <input className="input" name="q" placeholder="搜索模板..." defaultValue={q} />
        <input type="hidden" name="type" value={type} />
        <button className="btn btn-primary min-w-24">搜索</button>
      </form>
      <div className="mb-5 flex gap-2">
        <Link className={`btn ${type === "default" ? "btn-primary" : ""}`} href={`/templates?q=${encodeURIComponent(q)}&type=default`}>默认模板</Link>
        <Link className={`btn ${type === "plaza" ? "btn-primary" : ""}`} href={`/templates?q=${encodeURIComponent(q)}&type=plaza`}>模板广场</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {templates.map((template) => (
          <article key={template.id} className="panel rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{template.name}</h2>
                <p className="mt-2 min-h-12 text-sm text-white/50">{template.description || "暂无描述"}</p>
              </div>
              <span className="rounded-full bg-white/10 px-2 py-1 text-xs">{template.isOfficial ? "官方" : "广场"}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm text-white/55">
              <div>{template.proxyGroupCount} 代理组</div>
              <div>{template.ruleCount} 规则集</div>
              <div>{formatCount(template.downloads)} 使用</div>
              <div>{template.likes} 喜欢</div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-white/40">
              <span>{template.createdAt.slice(0, 10)}</span>
              <Link className="btn btn-primary h-9 px-4 text-sm" href={`/?template=${template.id}`}>使用</Link>
            </div>
          </article>
        ))}
      </div>
      {templates.length === 0 && <div className="panel rounded-2xl p-8 text-center text-white/50">没有找到相关模板</div>}
    </div>
  );
}
