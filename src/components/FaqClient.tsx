"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Article } from "@/lib/types";

const categories = [
  { label: "全部", value: "all" },
  { label: "常见问题", value: "faq" },
  { label: "使用指南", value: "guide" },
  { label: "Bug反馈", value: "bug" }
];

export function FaqClient({ initialArticles }: { initialArticles: Article[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [selectedId, setSelectedId] = useState(initialArticles[0]?.id || "");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const categoryValue = categories.find((item) => item.label === category)?.value || "all";
    return initialArticles.filter((article) => {
      const matchQuery = !normalized || `${article.title}\n${article.content}`.toLowerCase().includes(normalized);
      const matchCategory = categoryValue === "all" || article.category === categoryValue;
      return matchQuery && matchCategory;
    });
  }, [category, initialArticles, query]);
  const selected = initialArticles.find((article) => article.id === selectedId) || filtered[0] || initialArticles[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">帮助中心</h1>
        <p className="mt-2 text-white/50">常见问题解答和使用指南</p>
      </div>
      <div className="panel mb-5 rounded-2xl p-4">
        <input className="input" placeholder="搜索问题..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((item) => (
            <button key={item.value} className={`btn h-9 px-3 text-sm ${category === item.label ? "btn-primary" : ""}`} onClick={() => setCategory(item.label)}>{item.label}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[330px_1fr]">
        <aside className="panel h-max rounded-2xl p-3">
          <h2 className="px-2 py-2 text-sm font-semibold text-white/60">常见问题</h2>
          {filtered.length === 0 && <div className="px-2 py-6 text-sm text-white/40">没有找到相关问题</div>}
          {filtered.map((article) => (
            <button key={article.id} className={`w-full rounded-xl px-3 py-2 text-left text-sm ${selected?.id === article.id ? "bg-indigo-500/20 text-white" : "text-white/62 hover:bg-white/5"}`} onClick={() => setSelectedId(article.id)}>
              {article.title}
            </button>
          ))}
        </aside>
        <article className="panel prose prose-invert max-w-none rounded-2xl p-6 prose-a:text-indigo-300 prose-code:text-indigo-200">
          {selected ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content}</ReactMarkdown> : <p>请选择问题</p>}
        </article>
      </div>
    </div>
  );
}
