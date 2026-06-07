"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { CalendarClock, Copy, Download, Edit3, ExternalLink, FileCode, Link2, Loader2, LogOut, Plus, QrCode, RefreshCw, Save, Settings, Sparkles, Trash2 } from "lucide-react";
import { formatAppDate } from "@/lib/date";
import { cn } from "@/lib/utils";

type SubscriptionItem = {
  id: string;
  name: string;
  token: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  cachedAt: string | null;
  lastRefreshAttemptAt: string | null;
  refreshError: string | null;
  refreshErrorAt: string | null;
  sourceCount: number;
  templateId: string;
  settings: {
    smartMatchNodes: boolean;
    autoUpdate: boolean;
    updateIntervalHours: number;
  };
  config?: {
    mode?: "quick" | "advanced";
    templateId: string;
    sources: Array<{
      id: string;
      type: "subscription_url" | "yaml" | "node_links";
      value: string;
      resolvedValue?: string;
      tag?: string;
      nameTemplate?: string;
    }>;
    yaml?: string;
    advancedYaml?: string;
    advancedSettings?: Record<string, unknown>;
    settings: {
      smartMatchNodes: boolean;
      autoUpdate: boolean;
      updateIntervalHours: number;
    };
  };
};

export function DashboardClient() {
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<SubscriptionItem | null>(null);
  const [settingsItem, setSettingsItem] = useState<SubscriptionItem | null>(null);
  const [manualCopyText, setManualCopyText] = useState("");
  const [displayTimeZone, setDisplayTimeZone] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/subscription", { cache: "no-store" });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setNotice(data.error || "加载订阅失败");
      if (response.status === 401) window.location.href = "/login";
      return;
    }
    setItems(data.subscriptions || []);
  }

  useEffect(() => {
    void load();
    void fetch("/api/app-config", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setDisplayTimeZone(data.displayTimeZone || null))
      .catch(() => setDisplayTimeZone(null));
  }, []);

  async function remove(id: string) {
    if (!window.confirm("确定删除这个订阅链接吗？删除后链接将失效。")) return;
    const response = await fetch(`/api/subscription?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setNotice(data.error || "删除订阅失败");
      return;
    }
    setNotice("订阅已删除");
    await load();
  }

  async function refresh(item: SubscriptionItem) {
    setRefreshingId(item.id);
    const response = await fetch("/api/subscription", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, action: "refresh" })
    });
    setRefreshingId(null);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setNotice(data.error || "刷新订阅失败");
      return;
    }
    setNotice(`已刷新：${item.name}`);
    await load();
  }

  async function saveSettings(item: SubscriptionItem, draft: { name: string; smartMatchNodes: boolean; autoUpdate: boolean; updateIntervalHours: number }) {
    setSavingSettings(true);
    const response = await fetch("/api/subscription", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        action: "update",
        name: draft.name,
        settings: {
          smartMatchNodes: draft.smartMatchNodes,
          autoUpdate: draft.autoUpdate,
          updateIntervalHours: draft.updateIntervalHours
        }
      })
    });
    setSavingSettings(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setNotice(data.error || "保存订阅设置失败");
      return;
    }
    setNotice(`已保存：${draft.name.trim() || item.name}`);
    setSettingsItem(null);
    await load();
  }

  async function copy(url: string) {
    const full = getFullUrl(url);
    const copied = await copyText(full);
    if (copied) {
      setNotice(`已复制：${full}`);
      return;
    }
    setManualCopyText(full);
    setNotice("自动复制失败，请在弹窗中手动复制订阅链接");
  }

  function editSubscription(item: SubscriptionItem) {
    if (!item.config) {
      setNotice("这条订阅缺少可编辑配置");
      return;
    }
    window.sessionStorage.setItem("subboost.subscriptionDraft.v1", JSON.stringify({
      editSubscriptionId: item.id,
      editSubscriptionUrl: item.url,
      mode: item.config.mode || "quick",
      previewMode: "visual",
      selectedTemplateId: item.config.templateId,
      sources: item.config.sources,
      yaml: item.config.yaml,
      advancedYaml: item.config.advancedYaml,
      advancedSettings: item.config.advancedSettings,
      subscriptionSettings: {
        name: item.name,
        smartMatchNodes: item.config.settings.smartMatchNodes,
        autoUpdate: item.config.settings.autoUpdate,
        updateIntervalHours: item.config.settings.updateIntervalHours
      }
    }));
    window.location.href = "/?intent=edit-subscription";
  }

  function download(url: string, name: string) {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${name || "subboost"}.yaml`;
    link.click();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">我的订阅</h1>
          <p className="mt-1 text-[13px] text-white/50">管理您的订阅链接</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn btn-primary" href="/"><Plus className="h-4 w-4 text-indigo-100" />新建订阅</Link>
          <button className="btn" onClick={logout}><LogOut className="h-4 w-4 text-white/70" />退出</button>
        </div>
      </div>

      {notice && <div className="mb-4 rounded-xl border border-indigo-400/30 bg-indigo-400/10 p-3 text-[13px] text-indigo-100">{notice}</div>}

      <section className="panel rounded-xl p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-[16px] font-semibold">订阅列表</h2>
          <button className="btn" onClick={load} disabled={loading}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />刷新</button>
        </div>

        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-lg border border-white/10 bg-white/[0.045] px-4 py-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/18 text-indigo-200"><FileCode className="h-5 w-5" /></span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-[15px] font-semibold">{item.name}</h3>
                        <StatusPill tone="amber"><Sparkles className="h-3 w-3" />本地订阅</StatusPill>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                        <StatusPill tone="slate"><CalendarClock className="h-3 w-3" />创建 {formatDate(item.createdAt, displayTimeZone)}</StatusPill>
                        <StatusPill tone="violet"><RefreshCw className="h-3 w-3" />更新 {formatDate(item.updatedAt, displayTimeZone)}</StatusPill>
                        <StatusPill tone={item.settings.autoUpdate ? "emerald" : "slate"}>
                          <RefreshCw className="h-3 w-3" />
                          {item.settings.autoUpdate ? <>每 <b>{item.settings.updateIntervalHours}</b> 小时</> : "静态订阅"}
                        </StatusPill>
                        <StatusPill tone={item.refreshError ? "rose" : item.cachedAt ? "emerald" : "slate"}>
                          <CalendarClock className="h-3 w-3" />
                          {item.refreshError ? "刷新失败" : item.cachedAt ? `缓存 ${formatDate(item.cachedAt, displayTimeZone)}` : "等待预热"}
                        </StatusPill>
                        <StatusPill tone="blue"><Link2 className="h-3 w-3" /><b>{item.sourceCount}</b> 个导入源</StatusPill>
                      </div>
                      {item.refreshError && <div className="mt-2 max-w-3xl truncate text-[11px] text-rose-200/80">最近刷新失败：{item.refreshError}</div>}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton label="编辑" tone="violet" icon={<Edit3 className="h-4 w-4" />} onClick={() => editSubscription(item)} />
                  <ActionButton label="设置" tone="slate" icon={<Settings className="h-4 w-4" />} onClick={() => setSettingsItem(item)} />
                  <ActionButton label="刷新" tone="emerald" icon={refreshingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} onClick={() => refresh(item)} disabled={refreshingId === item.id} />
                  <ActionButton label="复制链接" tone="blue" icon={<Copy className="h-4 w-4" />} onClick={() => copy(item.url)} />
                  <ActionButton label="二维码" tone="cyan" icon={<QrCode className="h-4 w-4" />} onClick={() => setDetailItem(item)} />
                  <ActionButton label="下载" tone="cyan" icon={<Download className="h-4 w-4" />} onClick={() => download(item.url, item.name)} />
                  <ActionButton label="删除" tone="rose" icon={<Trash2 className="h-4 w-4" />} onClick={() => remove(item.id)} />
                </div>
              </div>
            </article>
          ))}

          {items.length === 0 && (
            <div className="rounded-lg border border-dashed border-white/12 bg-white/[0.025] p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-200"><Link2 className="h-6 w-6" /></div>
              <div className="mt-3 text-[15px] font-semibold">暂无订阅</div>
              <p className="mt-1 text-[12px] text-white/45">回到首页生成配置后，点击“生成订阅链接”保存。</p>
              <Link className="btn btn-primary mt-4" href="/"><Plus className="h-4 w-4" />新建订阅</Link>
            </div>
          )}
        </div>
      </section>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Link href="/templates" className="panel rounded-xl p-5 hover:bg-white/[0.04]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/18 text-violet-200"><FileCode className="h-5 w-5" /></span>
              <div>
                <div className="font-semibold">我的模板</div>
                <div className="text-[12px] text-white/45">管理和分享您的配置模板</div>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-white/45" />
          </div>
        </Link>
        <button className="panel rounded-xl p-5 text-left opacity-70" disabled title="本地版暂未提供账户导出设置">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white/60"><Settings className="h-5 w-5" /></span>
              <div>
                <div className="font-semibold">账户设置</div>
                <div className="text-[12px] text-white/45">管理账户和数据导出</div>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-white/35" />
          </div>
        </button>
      </div>

      {detailItem && <SubscriptionDetail item={detailItem} displayTimeZone={displayTimeZone} onClose={() => setDetailItem(null)} onCopy={copy} />}
      {manualCopyText && <ManualCopyDialog value={manualCopyText} onClose={() => setManualCopyText("")} />}
      {settingsItem && (
        <SubscriptionSettings
          item={settingsItem}
          saving={savingSettings}
          onClose={() => setSettingsItem(null)}
          onSave={(draft) => saveSettings(settingsItem, draft)}
        />
      )}
    </div>
  );
}

type Tone = "amber" | "blue" | "cyan" | "emerald" | "rose" | "slate" | "violet";

const toneClass: Record<Tone, string> = {
  amber: "border-amber-300/25 bg-amber-400/10 text-amber-200",
  blue: "border-blue-300/25 bg-blue-400/10 text-blue-200",
  cyan: "border-cyan-300/25 bg-cyan-400/10 text-cyan-200",
  emerald: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
  rose: "border-rose-300/25 bg-rose-400/10 text-rose-200",
  slate: "border-white/12 bg-white/[0.055] text-white/62",
  violet: "border-violet-300/25 bg-violet-400/10 text-violet-200"
};

function StatusPill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex min-h-6 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-none", toneClass[tone])}>
      {children}
    </span>
  );
}

function ActionButton({ label, icon, onClick, disabled, tone }: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean; tone: Tone }) {
  return <button className={cn("btn h-8 px-2.5 text-[12px]", toneClass[tone])} onClick={onClick} disabled={disabled}>{icon}{label}</button>;
}

function SubscriptionDetail({ item, displayTimeZone, onClose, onCopy }: { item: SubscriptionItem; displayTimeZone: string | null; onClose: () => void; onCopy: (url: string) => void }) {
  const fullUrl = typeof window === "undefined" ? item.url : getFullUrl(item.url);
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(fullUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 260,
      color: {
        dark: "#111827",
        light: "#ffffff"
      }
    })
      .then((value) => {
        if (active) setQrDataUrl(value);
      })
      .catch(() => {
        if (active) setQrDataUrl("");
      });
    return () => {
      active = false;
    };
  }, [fullUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="panel w-full max-w-2xl rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="inline-flex items-center gap-2 text-xl font-bold"><QrCode className="h-6 w-6 text-indigo-300" />订阅二维码</h3>
            <p className="mt-1 text-[13px] text-white/45">{item.name}</p>
          </div>
          <button className="btn h-9 w-9 p-0" onClick={onClose}>×</button>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-[auto_1fr]">
          <div className="rounded-xl border border-white/10 bg-white p-3 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
            {qrDataUrl ? <img src={qrDataUrl} alt="订阅链接二维码" className="h-64 w-64" /> : <div className="flex h-64 w-64 items-center justify-center text-sm text-slate-500">二维码生成中</div>}
          </div>
          <div className="space-y-3 text-[13px]">
            <InfoRow label="订阅链接" value={fullUrl} />
            <InfoRow label="自动更新" value={item.settings.autoUpdate ? `开启，每 ${item.settings.updateIntervalHours} 小时` : "关闭，返回静态 YAML"} />
            <InfoRow label="智能匹配节点" value={item.settings.smartMatchNodes ? "开启" : "关闭"} />
            <InfoRow label="导入源" value={`${item.sourceCount} 个`} />
            <InfoRow label="缓存时间" value={item.cachedAt ? formatDate(item.cachedAt, displayTimeZone) : "暂无缓存"} />
            <InfoRow label="最后刷新尝试" value={item.lastRefreshAttemptAt ? formatDate(item.lastRefreshAttemptAt, displayTimeZone) : "暂无记录"} />
            <InfoRow label="刷新错误" value={item.refreshError || "无"} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn" onClick={onClose}>关闭</button>
          <button className="btn btn-primary" onClick={() => onCopy(item.url)}><Copy className="h-4 w-4" />复制链接</button>
        </div>
      </div>
    </div>
  );
}

function SubscriptionSettings({
  item,
  saving,
  onClose,
  onSave
}: {
  item: SubscriptionItem;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: { name: string; smartMatchNodes: boolean; autoUpdate: boolean; updateIntervalHours: number }) => void;
}) {
  const [name, setName] = useState(item.name);
  const [smartMatchNodes, setSmartMatchNodes] = useState(item.settings.smartMatchNodes);
  const [autoUpdate, setAutoUpdate] = useState(item.settings.autoUpdate);
  const [updateIntervalHours, setUpdateIntervalHours] = useState(item.settings.updateIntervalHours);

  function submit() {
    onSave({
      name: name.trim() || item.name,
      smartMatchNodes,
      autoUpdate,
      updateIntervalHours: Math.max(1, Number(updateIntervalHours) || 24)
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="panel w-full max-w-2xl rounded-2xl p-6 shadow-[0_24px_90px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="inline-flex items-center gap-2 text-2xl font-bold"><Settings className="h-7 w-7 text-indigo-300" />订阅设置</h3>
            <p className="mt-2 text-[14px] text-white/48">改名与自动更新配置，自动更新间隔最少 1 小时。</p>
          </div>
          <button className="btn h-9 w-9 p-0 text-xl text-white/65" onClick={onClose} disabled={saving}>×</button>
        </div>

        <label className="mt-7 block text-[14px] font-medium text-white/78">订阅名称</label>
        <input className="input mt-2 text-[15px]" value={name} onChange={(event) => setName(event.target.value)} />

        <div className="mt-6 space-y-5">
          <SettingToggle
            title="更新时智能匹配节点"
            description="刷新订阅时结合节点名称和参数识别同一节点，尽量保留节点顺序、改名和相关配置。"
            checked={smartMatchNodes}
            onToggle={() => setSmartMatchNodes((value) => !value)}
          />
          <SettingToggle
            title="启用自动更新"
            description="开启后后台任务会按间隔主动预热缓存，客户端拉取时优先返回缓存。"
            checked={autoUpdate}
            onToggle={() => setAutoUpdate((value) => !value)}
          />
        </div>

        {autoUpdate && (
          <div className="mt-6">
            <label className="block text-[14px] font-medium text-white/78">自动更新间隔（小时）</label>
            <input
              className="input mt-2 text-[15px]"
              min={1}
              type="number"
              value={updateIntervalHours}
              onChange={(event) => setUpdateIntervalHours(Math.max(1, Number(event.target.value) || 24))}
            />
          </div>
        )}

        <div className="mt-8 flex justify-end gap-3">
          <button className="btn min-w-24" onClick={onClose} disabled={saving}>取消</button>
          <button className="btn btn-primary min-w-24" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingToggle({ title, description, checked, onToggle }: { title: string; description: string; checked: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-[14px] font-medium text-white/78">{title}</div>
        <div className="mt-1 text-[12px] text-white/42">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={cn(
          "flex h-8 w-14 shrink-0 items-center rounded-full border p-1 transition",
          checked ? "justify-end border-indigo-300/35 bg-indigo-500/70" : "justify-start border-white/15 bg-white/10"
        )}
        onClick={onToggle}
      >
        <span className="h-6 w-6 rounded-full bg-white shadow-lg" />
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3 sm:grid-cols-[120px_1fr]">
      <div className="text-white/45">{label}</div>
      <div className="break-all text-white/78">{value}</div>
    </div>
  );
}

function ManualCopyDialog({ value, onClose }: { value: string; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="panel w-full max-w-xl rounded-2xl p-6 shadow-[0_24px_90px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="inline-flex items-center gap-2 text-xl font-bold"><Copy className="h-6 w-6 text-indigo-300" />手动复制订阅链接</h3>
            <p className="mt-1 text-[13px] text-white/45">当前浏览器限制了自动复制，请选中下方链接复制。</p>
          </div>
          <button className="btn h-9 w-9 p-0" onClick={onClose}>×</button>
        </div>
        <input ref={inputRef} className="input mt-5 font-mono text-[13px]" readOnly value={value} onFocus={(event) => event.currentTarget.select()} />
        <div className="mt-5 flex justify-end gap-3">
          <button className="btn" onClick={onClose}>关闭</button>
          <button className="btn btn-primary" onClick={() => inputRef.current?.select()}><Copy className="h-4 w-4" />选中链接</button>
        </div>
      </div>
    </div>
  );
}

const formatDate = formatAppDate;

function getFullUrl(url: string) {
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).toString();
}

async function copyText(text: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to the textarea path below.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}
