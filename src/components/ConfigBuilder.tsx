"use client";

import { useEffect, useMemo, useState } from "react";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { AlertCircle, ArrowDown, ArrowUp, Bot, Check, ChevronDown, Circle, Download, Eye, FileCode, FileCog, FileText, Filter, Gauge, HelpCircle, Heart, Key, Layers, Link2, ListTree, Loader2, Network, Plus, Radio, Route, Search, Server, Shield, SlidersHorizontal, Trash2, Upload, Wand2, X, Zap } from "lucide-react";
import { builtinTemplates, getTemplate } from "@/data/templates";
import { generateConfig } from "@/lib/generator";
import { parseSources, parseYamlNodes } from "@/lib/parser";
import type { GeneratedConfig, ImportSource, ProxyNode, SourceType, TemplateConfig } from "@/lib/types";
import { cn, newId } from "@/lib/utils";

const subscriptionDraftKey = "subboost.subscriptionDraft.v1";
const iconButtonClass = "btn h-10 w-10 shrink-0 rounded-lg border-white/15 bg-white/[0.055] p-0 text-white/75 hover:bg-white/12 hover:text-white";
const actionIconClass = "h-[18px] w-[18px] stroke-[2.2]";

type AdvancedProxyGroupDraft = {
  id: string;
  name: string;
  pattern: string;
};

type AdvancedSettings = {
  configName: string;
  monitorPort: boolean;
  mixedPort: number;
  allowLan: boolean;
  dnsMode: "fake-ip" | "redir-host";
  sniffer: boolean;
  nodeSearch: string;
  ruleBaseUrl: string;
  customRules: string;
  disabledGroupNames: string[];
  filterGroups: AdvancedProxyGroupDraft[];
  relayGroups: AdvancedProxyGroupDraft[];
};

type SubscriptionSettings = {
  name: string;
  smartMatchNodes: boolean;
  autoUpdate: boolean;
  updateIntervalHours: number;
};

type SubscriptionPayload = {
  name: string;
  templateId: string;
  sources: ImportSource[];
  yaml: string;
  mode?: "quick" | "advanced";
  advancedYaml?: string;
  advancedSettings?: AdvancedSettings;
  settings?: SubscriptionSettings;
};

const defaultAdvancedSettings: AdvancedSettings = {
  configName: "我的配置 2026/06/07",
  monitorPort: false,
  mixedPort: 7897,
  allowLan: true,
  dnsMode: "fake-ip",
  sniffer: true,
  nodeSearch: "",
  ruleBaseUrl: "https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo",
  customRules: "",
  disabledGroupNames: [],
  filterGroups: [],
  relayGroups: []
};

const defaultSubscriptionSettings: SubscriptionSettings = {
  name: "我的配置 2026/06/07",
  smartMatchNodes: true,
  autoUpdate: false,
  updateIntervalHours: 24
};

const sourceOptions: Array<{ type: SourceType; label: string; description: string; placeholder: string }> = [
  {
    type: "subscription_url",
    label: "订阅链接",
    description: "输入订阅链接，系统将自动获取节点",
    placeholder: "https://example.com/sub?token=xxx"
  },
  {
    type: "yaml",
    label: "YAML 配置",
    description: "粘贴完整的 Clash YAML 配置文件",
    placeholder: "proxies:\n  - name: 节点名称\n    type: vmess\n    ..."
  },
  {
    type: "node_links",
    label: "节点链接",
    description: "每行一个节点链接，支持 ss/vmess/vless/trojan/hy2/tuic",
    placeholder: "ss://...\nvmess://...\nvless://...\ntrojan://...\nhysteria2://... / hy2://...\ntuic://..."
  }
];

export function ConfigBuilder({ initialTemplateId }: { initialTemplateId?: string }) {
  const [mode, setMode] = useState<"quick" | "advanced">("quick");
  const [previewMode, setPreviewMode] = useState<"visual" | "yaml">("visual");
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplateId || "builtin-minimal");
  const [editSubscriptionId, setEditSubscriptionId] = useState<string | null>(null);
  const [editSubscriptionUrl, setEditSubscriptionUrl] = useState<string | null>(null);
  const [sources, setSources] = useState<ImportSource[]>([
    { id: newId("source"), type: "subscription_url", value: "" },
    { id: newId("source"), type: "yaml", value: "" },
    { id: newId("source"), type: "node_links", value: "" }
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingSource, setEditingSource] = useState<ImportSource | null>(null);
  const [generated, setGenerated] = useState<GeneratedConfig | null>(null);
  const [notice, setNotice] = useState("");
  const [loadingSourceId, setLoadingSourceId] = useState<string | null>(null);
  const [creatingSubscription, setCreatingSubscription] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [subscriptionSettings, setSubscriptionSettings] = useState<SubscriptionSettings>(defaultSubscriptionSettings);
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>(defaultAdvancedSettings);
  const [advancedYaml, setAdvancedYaml] = useState(`# 基础配置
mixed-port: 7897
allow-lan: true
mode: rule
log-level: info

# DNS 配置
dns:
  enable: true
  enhanced-mode: fake-ip`);

  const parsed = useMemo(() => parseSources(sources), [sources]);
  const selectedTemplate = getTemplate(selectedTemplateId);

  useEffect(() => {
    const rawDraft = window.sessionStorage.getItem(subscriptionDraftKey);
    if (!rawDraft) return;

    try {
      const draft = JSON.parse(rawDraft) as {
        mode?: "quick" | "advanced";
        previewMode?: "visual" | "yaml";
        selectedTemplateId?: string;
        sources?: ImportSource[];
        generated?: GeneratedConfig | null;
        advancedYaml?: string;
        advancedSettings?: AdvancedSettings;
        subscriptionSettings?: SubscriptionSettings;
        editSubscriptionId?: string;
        editSubscriptionUrl?: string;
        yaml?: string;
      };

      if (draft.mode) setMode(draft.mode);
      if (draft.previewMode) setPreviewMode(draft.previewMode);
      if (draft.selectedTemplateId) setSelectedTemplateId(draft.selectedTemplateId);
      if (Array.isArray(draft.sources)) {
        const activeDraftSources = draft.sources.filter(hasSourceContent);
        setSources(draft.mode === "advanced" && activeDraftSources.length ? activeDraftSources : draft.sources);
      }
      if (draft.generated) setGenerated(draft.generated);
      else if (typeof draft.yaml === "string" && draft.yaml.trim()) setGenerated(summarizeAdvancedYaml(draft.yaml));
      if (typeof draft.advancedYaml === "string") setAdvancedYaml(draft.advancedYaml);
      if (draft.advancedSettings) setAdvancedSettings({ ...defaultAdvancedSettings, ...draft.advancedSettings });
      if (draft.subscriptionSettings) setSubscriptionSettings({ ...defaultSubscriptionSettings, ...draft.subscriptionSettings });
      if (draft.editSubscriptionId) {
        setEditSubscriptionId(draft.editSubscriptionId);
        setEditSubscriptionUrl(draft.editSubscriptionUrl || null);
        window.sessionStorage.removeItem(subscriptionDraftKey);
        const url = new URL(window.location.href);
        url.searchParams.delete("intent");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
        setNotice(`正在编辑订阅：${draft.subscriptionSettings?.name || "未命名订阅"}`);
        return;
      }

      const url = new URL(window.location.href);
      if (url.searchParams.get("intent") === "subscription" && draft.generated && draft.selectedTemplateId && Array.isArray(draft.sources)) {
        window.sessionStorage.removeItem(subscriptionDraftKey);
        url.searchParams.delete("intent");
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
        setNotice("已恢复登录前的配置，正在生成订阅链接...");
        const activeDraftSources = draft.sources.filter(hasSourceContent);
        void postSubscription({
          name: draft.subscriptionSettings?.name || `${getTemplate(draft.selectedTemplateId).name} 配置`,
          templateId: draft.selectedTemplateId,
          sources: activeDraftSources.length ? activeDraftSources : draft.sources,
          yaml: draft.generated.yaml,
          mode: draft.mode,
          advancedYaml: draft.advancedYaml,
          advancedSettings: draft.advancedSettings,
          settings: draft.subscriptionSettings || defaultSubscriptionSettings
        });
      } else {
        setNotice("已恢复登录前的配置，请继续生成订阅链接。");
      }
    } catch {
      window.sessionStorage.removeItem(subscriptionDraftKey);
    }
  }, []);

  function updateSource(id: string, patch: Partial<ImportSource>) {
    setSources((current) => current.map((source) => (source.id === id ? { ...source, ...patch } : source)));
  }

  function moveSource(index: number, direction: -1 | 1) {
    setSources((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function switchMode(nextMode: "quick" | "advanced") {
    if (nextMode === "advanced") {
      setSources((current) => {
        const activeSources = current.filter(hasSourceContent);
        return activeSources.length ? activeSources : current.slice(0, 1);
      });
    }
    setMode(nextMode);
  }

  function runGenerate() {
    if (mode === "advanced") {
      const result = applyAdvancedSettings(generateConfig(parsed.nodes, selectedTemplate), advancedSettings, parsed.nodes);
      setGenerated(result);
      setNotice(`已生成高级配置预览（${result.nodeCount} 节点）`);
      return;
    }
    const result = generateConfig(parsed.nodes, selectedTemplate);
    setGenerated(result);
    setNotice(`已导入并生成配置（${result.nodeCount} 节点）`);
  }

  function downloadConfig() {
    if (!generated) return;
    const blob = new Blob([generated.yaml], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "subboost-local.yaml";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importSubscriptionSource(source: ImportSource) {
    setLoadingSourceId(source.id);
    setNotice("");
    try {
      const response = await fetch("/api/fetch-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: source.value })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "订阅导入失败");
      updateSource(source.id, { resolvedValue: data.content });
      setNotice(`已导入此源（${data.nodes?.length || 0} 节点）`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "订阅导入失败");
    } finally {
      setLoadingSourceId(null);
    }
  }

  async function createSubscriptionLink() {
    if (!generated) return;
    setSubscriptionSettings((current) => ({
      ...current,
      name: current.name.trim() || advancedSettings.configName || `${selectedTemplate.name} 配置`
    }));
    setShowSubscriptionDialog(true);
  }

  function exitEditMode() {
    window.sessionStorage.removeItem(subscriptionDraftKey);
    window.location.href = "/dashboard";
  }

  async function confirmCreateSubscription(settings: SubscriptionSettings) {
    if (!generated) return;
    setNotice("");
    const me = await fetch("/api/auth/me").then((response) => response.json()).catch(() => ({ user: null }));
    if (!me.user) {
      window.sessionStorage.setItem(subscriptionDraftKey, JSON.stringify({
        mode,
        previewMode,
        selectedTemplateId,
        sources,
        generated,
        advancedYaml,
        advancedSettings,
        subscriptionSettings: settings
      }));
      window.location.href = "/login?next=%2F%3Fintent%3Dsubscription";
      return;
    }
    const activeSources = sources.filter(hasSourceContent);
    const payload = {
      name: settings.name,
      templateId: selectedTemplateId,
      sources: activeSources.length ? activeSources : sources,
      yaml: generated.yaml,
      mode,
      advancedYaml,
      advancedSettings,
      settings
    };
    if (editSubscriptionId) await updateSubscriptionConfig(editSubscriptionId, payload);
    else await postSubscription(payload);
    setShowSubscriptionDialog(false);
  }

  async function postSubscription(payload: SubscriptionPayload) {
    setCreatingSubscription(true);
    try {
      const response = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.error || "生成订阅链接失败");
        return;
      }
      setNotice(`订阅链接已生成：${window.location.origin}${data.subscription.url}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "生成订阅链接失败");
    } finally {
      setCreatingSubscription(false);
    }
  }

  async function updateSubscriptionConfig(id: string, payload: SubscriptionPayload) {
    setCreatingSubscription(true);
    try {
      const response = await fetch("/api/subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "updateConfig", ...payload })
      });
      const data = await response.json();
      if (!response.ok) {
        setNotice(data.error || "保存订阅失败");
        return;
      }
      const url = data.subscription?.url || editSubscriptionUrl || "";
      setEditSubscriptionUrl(url);
      setNotice(`订阅已保存，地址保持不变：${window.location.origin}${url}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存订阅失败");
    } finally {
      setCreatingSubscription(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-none px-4 py-8 sm:px-6 lg:px-12 2xl:px-24">
      <section className="mb-7 text-center">
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">SubBoost</h1>
        <p className="mx-auto mt-2 max-w-3xl text-[13px] text-white/58">
          Clash 订阅转换、生成与管理服务，支持链式代理、智能分流、多协议和多订阅聚合
        </p>
        <div className="mt-4 inline-flex items-center justify-center gap-4 rounded-lg border border-white/10 bg-white/[0.035] px-40 py-2 text-[12px] text-indigo-200">
          <a href="/faq">配置教程和常见问题</a>
          <span className="text-white/20">|</span>
          <span className="inline-flex items-center gap-1"><Bot className="h-4 w-4" /> AI 不降智的代理方案</span>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section id="config" className="panel rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="inline-flex items-center gap-2 text-[15px] font-semibold"><SlidersHorizontal className="h-4 w-4 text-indigo-300" />配置生成器</h2>
              <p className="mt-1 text-[12px] text-white/42">导入节点、选择模板，然后生成 Mihomo YAML。</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-1">
              <button className={tabClass(mode === "quick")} onClick={() => switchMode("quick")}><Zap className="h-3.5 w-3.5" />快捷模式</button>
              <button className={tabClass(mode === "advanced")} onClick={() => switchMode("advanced")}><SlidersHorizontal className="h-3.5 w-3.5" />高级模式</button>
            </div>
          </div>

          {mode === "quick" ? (
            <QuickMode
              sources={sources}
              parsedCount={parsed.nodes.length}
              selectedTemplateId={selectedTemplateId}
              showAdd={showAdd}
              onToggleAdd={() => setShowAdd((value) => !value)}
              onAdd={(type) => {
                setSources((current) => [...current, { id: newId("source"), type, value: "" }]);
                setShowAdd(false);
              }}
              onUpdate={updateSource}
              onMove={moveSource}
              onDelete={(id) => setSources((current) => current.filter((source) => source.id !== id))}
              onEdit={(source) => setEditingSource(source)}
              onTemplate={setSelectedTemplateId}
              onImport={importSubscriptionSource}
              loadingSourceId={loadingSourceId}
            />
          ) : (
            <AdvancedMode
              sources={sources}
              nodes={parsed.nodes}
              selectedTemplateId={selectedTemplateId}
              selectedTemplate={selectedTemplate}
              settings={advancedSettings}
              onSettings={setAdvancedSettings}
              onUpdateSource={updateSource}
              onMoveSource={moveSource}
              onDeleteSource={(id) => setSources((current) => current.filter((source) => source.id !== id))}
              onEditSource={(source) => setEditingSource(source)}
              onImportSource={importSubscriptionSource}
              onAddSource={(type) => setSources((current) => [...current, { id: newId("source"), type, value: "" }])}
              onTemplate={setSelectedTemplateId}
              onGenerate={runGenerate}
              loadingSourceId={loadingSourceId}
            />
          )}

          {mode === "quick" && parsed.errors.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-[12px] text-amber-100">
              {parsed.errors.slice(0, 4).map((error) => (
                <div key={error} className="flex gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>
              ))}
            </div>
          )}

          {mode === "quick" && (
            <button className="btn btn-primary mt-5 w-full" disabled={parsed.nodes.length === 0} onClick={runGenerate}>
              <Wand2 className="h-4 w-4" />
              生成配置
            </button>
          )}
        </section>

        <section id="preview" className="panel rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="inline-flex items-center gap-2 text-[15px] font-semibold"><Eye className="h-4 w-4 text-indigo-300" />预览</h2>
              <p className="mt-1 text-[12px] text-white/42">查看 YAML 或可视化代理组。</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-1">
              <button className={tabClass(previewMode === "yaml")} onClick={() => setPreviewMode("yaml")}>YAML</button>
              <button className={tabClass(previewMode === "visual")} onClick={() => setPreviewMode("visual")}>可视化</button>
            </div>
          </div>
          <Preview generated={generated} previewMode={previewMode} />
          <div className={cn("mt-4 grid gap-3", editSubscriptionId ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
            <button className="btn" disabled={!generated} onClick={downloadConfig}>
              <Download className="h-4 w-4" />
              下载配置
            </button>
            <button className="btn" disabled={!generated || creatingSubscription} onClick={createSubscriptionLink}>
              {creatingSubscription && <Loader2 className="h-4 w-4 animate-spin" />}
              {!creatingSubscription && <Link2 className="h-4 w-4" />}
              {editSubscriptionId ? "保存订阅" : "生成订阅链接"}
            </button>
            {editSubscriptionId && (
              <button className="btn border-rose-400/35 bg-rose-500/10 text-rose-200 hover:border-rose-300/70 hover:bg-rose-500/16" onClick={exitEditMode}>
                <X className="h-4 w-4" />
                退出编辑
              </button>
            )}
          </div>
          {notice && <div className="mt-4 rounded-lg border border-indigo-400/30 bg-indigo-400/10 p-3 text-[12px] text-indigo-100">{notice}</div>}
        </section>
      </div>

      {editingSource && (
        <SourceDialog
          source={editingSource}
          onClose={() => setEditingSource(null)}
          onSave={(source) => {
            updateSource(source.id, source);
            setEditingSource(null);
          }}
        />
      )}

      {showSubscriptionDialog && generated && (
        <SubscriptionDialog
          settings={subscriptionSettings}
          creating={creatingSubscription}
          editing={Boolean(editSubscriptionId)}
          existingUrl={editSubscriptionUrl}
          onClose={() => setShowSubscriptionDialog(false)}
          onChange={setSubscriptionSettings}
          onConfirm={confirmCreateSubscription}
        />
      )}
    </div>
  );
}

function QuickMode(props: {
  sources: ImportSource[];
  parsedCount: number;
  selectedTemplateId: string;
  showAdd: boolean;
  onToggleAdd: () => void;
  onAdd: (type: SourceType) => void;
  onUpdate: (id: string, patch: Partial<ImportSource>) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onDelete: (id: string) => void;
  onEdit: (source: ImportSource) => void;
  onTemplate: (id: string) => void;
  onImport: (source: ImportSource) => void;
  loadingSourceId: string | null;
}) {
  return (
    <div className="space-y-4">
      {props.sources.map((source, index) => (
        <div key={source.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {sourceOptions.map((option) => (
              <button key={option.type} className={cn("inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px]", source.type === option.type ? "bg-indigo-500 text-white" : "bg-white/6 text-white/70 hover:bg-white/10 hover:text-white")} onClick={() => props.onUpdate(source.id, { type: option.type })}>
                {sourceIcon(option.type)}
                {option.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-1">
              <span className="mr-2 inline-flex items-center gap-2 text-[13px] text-white/78">{sourceIcon(source.type)}{labelFor(source.type)} #{index + 1}</span>
              {source.type === "subscription_url" && source.resolvedValue ? <span className="inline-flex items-center rounded-full bg-emerald-400/15 px-2 py-1 text-[11px] text-emerald-200"><Check className="mr-1 h-3 w-3" />已导入</span> : source.value && <span className="inline-flex items-center rounded-full bg-emerald-400/15 px-2 py-1 text-[11px] text-emerald-200"><Check className="mr-1 h-3 w-3" />已填写</span>}
              <button className={iconButtonClass} disabled={index === 0} onClick={() => props.onMove(index, -1)} aria-label="上移"><ArrowUp className={actionIconClass} /></button>
              <button className={iconButtonClass} disabled={index === props.sources.length - 1} onClick={() => props.onMove(index, 1)} aria-label="下移"><ArrowDown className={actionIconClass} /></button>
              <button className={iconButtonClass} onClick={() => props.onEdit(source)} aria-label="高级编辑"><FileCode className={actionIconClass} /></button>
              <button className={iconButtonClass} onClick={() => props.onDelete(source.id)} aria-label="删除"><Trash2 className={actionIconClass} /></button>
            </div>
          </div>
          {source.type === "subscription_url" ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input className="input" value={source.value} placeholder={optionFor(source.type).placeholder} onChange={(event) => props.onUpdate(source.id, { value: event.target.value, resolvedValue: undefined })} />
              <button className="btn min-w-28" disabled={!source.value || props.loadingSourceId === source.id} onClick={() => props.onImport(source)}>
                {props.loadingSourceId === source.id && <Loader2 className="h-4 w-4 animate-spin" />}
                {props.loadingSourceId !== source.id && <Download className="h-4 w-4" />}
                导入此源
              </button>
            </div>
          ) : (
            <textarea className="input min-h-28 resize-y" value={source.value} placeholder={optionFor(source.type).placeholder} onChange={(event) => props.onUpdate(source.id, { value: event.target.value })} />
          )}
        </div>
      ))}

      <button className="btn w-full border-dashed" onClick={props.onToggleAdd}><Plus className="h-4 w-4" />添加订阅/节点源</button>
      {props.showAdd && (
        <div className="grid gap-3 sm:grid-cols-3">
          {sourceOptions.map((option) => (
            <button key={option.type} className="rounded-lg border border-white/10 bg-white/5 p-3 text-left hover:bg-white/10" onClick={() => props.onAdd(option.type)}>
              <div className="inline-flex items-center gap-2 text-[13px] font-medium">{sourceIcon(option.type)}{option.label}</div>
              <div className="mt-1 text-xs text-white/45">{option.description}</div>
            </button>
          ))}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] text-white/60">选择模板</span>
          <span className="text-xs text-white/40">{props.parsedCount} 个节点已解析</span>
        </div>
        <div className="grid gap-2">
          {builtinTemplates.map((template) => (
            <button key={template.id} onClick={() => props.onTemplate(template.id)} className={cn("grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition", props.selectedTemplateId === template.id ? "border-indigo-400 bg-indigo-500/15 shadow-[0_0_0_1px_rgba(129,140,248,0.25)]" : "border-white/10 bg-white/5 hover:bg-white/10")}>
              <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full border", props.selectedTemplateId === template.id ? "border-indigo-300 text-indigo-200" : "border-white/35 text-white/55")}>
                {props.selectedTemplateId === template.id ? <Radio className="h-4 w-4 fill-current" /> : <Circle className="h-3.5 w-3.5" />}
              </span>
              <div>
                <div className="flex items-center gap-2 text-[13px] font-medium">
                  {template.name}
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/45"><Heart className="h-3 w-3" />{template.likes}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-white/45">{template.description}</p>
              </div>
              <div className="text-right text-[11px] leading-5 text-white/45">{template.proxyGroupCount} 代理组<br />{template.ruleCount} 规则集</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdvancedMode(props: {
  sources: ImportSource[];
  nodes: ProxyNode[];
  selectedTemplateId: string;
  selectedTemplate: TemplateConfig;
  settings: AdvancedSettings;
  onSettings: (settings: AdvancedSettings) => void;
  onUpdateSource: (id: string, patch: Partial<ImportSource>) => void;
  onMoveSource: (index: number, direction: -1 | 1) => void;
  onDeleteSource: (id: string) => void;
  onEditSource: (source: ImportSource) => void;
  onImportSource: (source: ImportSource) => void;
  onAddSource: (type: SourceType) => void;
  onTemplate: (id: string) => void;
  onGenerate: () => void;
  loadingSourceId: string | null;
}) {
  const settings = props.settings;
  const filteredNodes = props.nodes.filter((node) => {
    const query = settings.nodeSearch.trim().toLowerCase();
    if (!query) return true;
    return `${node.name} ${node.type} ${node.server || ""}`.toLowerCase().includes(query);
  });
  const enabledGroups = props.selectedTemplate.groups.filter((group) => !settings.disabledGroupNames.includes(group.name));
  const ruleRows = props.selectedTemplate.ruleProviders.map((provider, index) => {
    const group = props.selectedTemplate.groups.find((item) => item.ruleProviderNames?.includes(provider.name));
    return { provider, group, index };
  });

  function patch(patchValue: Partial<AdvancedSettings>) {
    props.onSettings({ ...settings, ...patchValue });
  }

  function addDraftGroup(key: "filterGroups" | "relayGroups") {
    const next = [
      ...settings[key],
      { id: newId(key === "filterGroups" ? "filter" : "relay"), name: key === "filterGroups" ? "筛选组" : "中转组", pattern: key === "filterGroups" ? "香港|日本|新加坡" : "入口 -> 出口" }
    ];
    patch({ [key]: next } as Pick<AdvancedSettings, typeof key>);
  }

  function updateDraftGroup(key: "filterGroups" | "relayGroups", id: string, draftPatch: Partial<AdvancedProxyGroupDraft>) {
    patch({ [key]: settings[key].map((item) => (item.id === id ? { ...item, ...draftPatch } : item)) } as Pick<AdvancedSettings, typeof key>);
  }

  function deleteDraftGroup(key: "filterGroups" | "relayGroups", id: string) {
    patch({ [key]: settings[key].filter((item) => item.id !== id) } as Pick<AdvancedSettings, typeof key>);
  }

  function toggleGroup(name: string) {
    const disabled = settings.disabledGroupNames.includes(name)
      ? settings.disabledGroupNames.filter((item) => item !== name)
      : [...settings.disabledGroupNames, name];
    patch({ disabledGroupNames: disabled });
  }

  const baseYamlPreview = stringifyYaml({
    "mixed-port": settings.mixedPort,
    "allow-lan": settings.allowLan,
    mode: "rule",
    "log-level": "info",
    "unified-delay": true,
    "tcp-concurrent": true,
    "global-client-fingerprint": "chrome",
    dns: {
      enable: true,
      listen: "127.0.0.1:5335",
      "enhanced-mode": settings.dnsMode
    },
    sniffer: { enable: settings.sniffer }
  }, { lineWidth: 0 });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-500/12 px-3 py-1 text-[12px] text-indigo-100">
          编辑中 {settings.configName}
        </div>
        <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[12px] font-semibold text-sky-200">{props.sources.length} 个导入源</span>
      </div>

      <AdvancedSection icon={<Server className="h-4 w-4" />} title="节点导入" badge={`${props.sources.length} 个导入源`}>
        <div className="space-y-2">
          {props.sources.map((source, index) => (
            <div key={source.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[12px] text-white/60">
                {sourceIcon(source.type)}
                <span>{labelFor(source.type)} #{index + 1}</span>
                <div className="ml-auto flex items-center gap-1">
                  <button className={iconButtonClass} disabled={index === 0} onClick={() => props.onMoveSource(index, -1)} aria-label="上移"><ArrowUp className={actionIconClass} /></button>
                  <button className={iconButtonClass} disabled={index === props.sources.length - 1} onClick={() => props.onMoveSource(index, 1)} aria-label="下移"><ArrowDown className={actionIconClass} /></button>
                  <button className={iconButtonClass} onClick={() => props.onEditSource(source)} aria-label="高级编辑"><FileCode className={actionIconClass} /></button>
                  <button className={iconButtonClass} onClick={() => props.onDeleteSource(source.id)} aria-label="删除"><Trash2 className={actionIconClass} /></button>
                </div>
              </div>
              {source.type === "subscription_url" ? (
                <div className="flex gap-2">
                  <input className="input" value={source.value} placeholder={optionFor(source.type).placeholder} onChange={(event) => props.onUpdateSource(source.id, { value: event.target.value, resolvedValue: undefined })} />
                  <button className="btn min-w-28" disabled={!source.value || props.loadingSourceId === source.id} onClick={() => props.onImportSource(source)}>
                    {props.loadingSourceId === source.id ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Download className="h-[18px] w-[18px]" />}
                    导入
                  </button>
                </div>
              ) : (
                <textarea className="input min-h-20 resize-y" value={source.value} placeholder={optionFor(source.type).placeholder} onChange={(event) => props.onUpdateSource(source.id, { value: event.target.value })} />
              )}
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-3">
            {sourceOptions.map((option) => (
              <button key={option.type} className="btn border-dashed" onClick={() => props.onAddSource(option.type)}><Plus className="h-4 w-4" />{option.label}</button>
            ))}
          </div>
        </div>
      </AdvancedSection>

      <AdvancedSection icon={<ListTree className="h-4 w-4" />} title="节点管理" badge={props.nodes.length ? `${props.nodes.length} 节点` : "无节点"}>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <input className="input pl-9" value={settings.nodeSearch} placeholder="搜索节点..." onChange={(event) => patch({ nodeSearch: event.target.value })} />
          </div>
          <button className={cn("btn", settings.monitorPort && "btn-primary")} onClick={() => patch({ monitorPort: !settings.monitorPort })}><Gauge className="h-4 w-4" />监听端口</button>
          <button className="btn" disabled title="节点批量编辑暂未接入">批量编辑</button>
        </div>
        {filteredNodes.length ? (
          <div className="mt-3 flex max-h-36 flex-wrap gap-2 overflow-auto">
            {filteredNodes.map((node) => <span key={node.id} className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-white/65">{node.name} · {node.type.toUpperCase()}</span>)}
          </div>
        ) : (
          <div className="py-8 text-center text-[12px] text-white/35">请先在上方导入节点</div>
        )}
      </AdvancedSection>

      <DraftGroupSection title="筛选代理组" icon={<Filter className="h-4 w-4" />} hint="可在此创建仅包含部分节点的代理组" groups={settings.filterGroups} onAdd={() => addDraftGroup("filterGroups")} onUpdate={(id, value) => updateDraftGroup("filterGroups", id, value)} onDelete={(id) => deleteDraftGroup("filterGroups", id)} />
      <DraftGroupSection title="中转代理组" icon={<Route className="h-4 w-4" />} hint="用于配置链式代理关系" groups={settings.relayGroups} onAdd={() => addDraftGroup("relayGroups")} onUpdate={(id, value) => updateDraftGroup("relayGroups", id, value)} onDelete={(id) => deleteDraftGroup("relayGroups", id)} />

      <AdvancedSection icon={<Layers className="h-4 w-4" />} title="分流代理组" badge={`${enabledGroups.length}/${props.selectedTemplate.groups.length}`}>
        <label className="mb-2 block text-[12px] text-white/45">规则集 URL</label>
        <input className="input mb-3" value={settings.ruleBaseUrl} onChange={(event) => patch({ ruleBaseUrl: event.target.value })} />
        <div className="space-y-2">
          <div className="rounded-md bg-white/6 px-3 py-2 text-[12px] text-white/65"><ChevronDown className="mr-2 inline h-3.5 w-3.5" />核心组 <span className="float-right">{enabledGroups.length}/{props.selectedTemplate.groups.length}</span></div>
          {props.selectedTemplate.groups.map((group) => {
            const disabled = settings.disabledGroupNames.includes(group.name);
            return (
              <div key={group.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2">
                <div>
                  <div className="text-[13px] font-medium">{group.icon} {group.name}</div>
                  <div className="text-[11px] text-white/40">{group.description} · {group.ruleProviderNames?.length || 0} 规则</div>
                </div>
                <button className={cn("h-5 w-9 rounded-full border transition", disabled ? "border-white/20 bg-white/10" : "border-indigo-300/60 bg-indigo-500")} onClick={() => toggleGroup(group.name)} aria-label={`切换${group.name}`}>
                  <span className={cn("block h-4 w-4 rounded-full bg-white transition", disabled ? "translate-x-0.5" : "translate-x-4")} />
                </button>
                <button className="btn h-7 w-7 p-0" onClick={() => toggleGroup(group.name)} title="关闭此分流组"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            );
          })}
        </div>
      </AdvancedSection>

      <AdvancedSection icon={<FileCog className="h-4 w-4" />} title="自定义分流规则" badge={settings.customRules.trim() ? "已填写" : "可选"}>
        <textarea className="input min-h-20" value={settings.customRules} placeholder="DOMAIN-SUFFIX,example.com,🚀 节点选择\nDOMAIN,openai.com,🤖 AI 服务" onChange={(event) => patch({ customRules: event.target.value })} />
      </AdvancedSection>

      <AdvancedSection icon={<ListTree className="h-4 w-4" />} title="规则管理" badge={`${ruleRows.filter((row) => row.group && !settings.disabledGroupNames.includes(row.group.name)).length} / 全部 ${ruleRows.length}`}>
        <div className="space-y-2">
          {ruleRows.map((row) => {
            const disabled = !row.group || settings.disabledGroupNames.includes(row.group.name);
            return (
              <div key={row.provider.name} className={cn("grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-white/10 px-3 py-2", disabled ? "bg-white/[0.02] text-white/35" : "bg-white/[0.04]")}>
                <div className="text-[12px]"><span className="mr-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{row.provider.behavior}</span>RULE-SET,{row.provider.name},{row.group?.name || "未分配"}</div>
                <span className="rounded-md bg-black/25 px-2 py-1 text-[11px]">顺序 {row.index + 1}</span>
              </div>
            );
          })}
        </div>
      </AdvancedSection>

      <AdvancedSection icon={<Shield className="h-4 w-4" />} title="基础和 DNS 配置" badge="YAML">
        <div className="mb-3 grid gap-3 sm:grid-cols-4">
          <label className="text-[12px] text-white/55">mixed-port<input className="input mt-1" type="number" value={settings.mixedPort} onChange={(event) => patch({ mixedPort: Number(event.target.value) || 7897 })} /></label>
          <div className="text-[12px] text-white/55">
            DNS 模式
            <div className="mt-1 grid grid-cols-2 rounded-lg border border-white/10 bg-white/5 p-1">
              {(["fake-ip", "redir-host"] as const).map((modeOption) => (
                <button key={modeOption} className={cn("rounded-md px-3 py-2 text-[13px] transition", settings.dnsMode === modeOption ? "bg-indigo-500/75 text-white shadow-[0_0_0_1px_rgba(129,140,248,0.35)]" : "text-white/70 hover:bg-white/10 hover:text-white")} onClick={() => patch({ dnsMode: modeOption })}>
                  {modeOption}
                </button>
              ))}
            </div>
          </div>
          <button className={cn("btn mt-5", settings.allowLan && "btn-primary")} onClick={() => patch({ allowLan: !settings.allowLan })}>允许局域网</button>
          <button className={cn("btn mt-5", settings.sniffer && "btn-primary")} onClick={() => patch({ sniffer: !settings.sniffer })}>嗅探</button>
        </div>
        <pre className="max-h-56 overflow-auto rounded-lg border border-white/10 bg-black/35 p-3 text-[11px] leading-relaxed text-white/70">{baseYamlPreview}</pre>
      </AdvancedSection>

      <div className="flex justify-center gap-3">
        <button className="btn btn-primary" disabled={props.nodes.length === 0} onClick={props.onGenerate}><Wand2 className="h-4 w-4" />生成配置</button>
        <button className="btn" disabled title="模板上传涉及模板广场/审核流程，本地版暂未接入"><Upload className="h-4 w-4" />上传模板</button>
      </div>
    </div>
  );
}

function AdvancedSection({ icon, title, badge, children }: { icon: React.ReactNode; title: string; badge?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-black/18 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-[14px] font-semibold text-white/90">{icon}{title}</h3>
        {badge && <span className="rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-[11px] text-white/65">{badge}</span>}
      </div>
      {children}
    </section>
  );
}

function DraftGroupSection(props: {
  title: string;
  icon: React.ReactNode;
  hint: string;
  groups: AdvancedProxyGroupDraft[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<AdvancedProxyGroupDraft>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <AdvancedSection icon={props.icon} title={props.title} badge="可选">
      {props.groups.length === 0 ? (
        <div className="py-6 text-center text-[12px] text-white/35">{props.hint}</div>
      ) : (
        <div className="space-y-2">
          {props.groups.map((group) => (
            <div key={group.id} className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-3 sm:grid-cols-[220px_1fr_auto]">
              <input className="input" value={group.name} onChange={(event) => props.onUpdate(group.id, { name: event.target.value })} />
              <input className="input" value={group.pattern} placeholder="按节点名关键词匹配，例如 香港|日本|新加坡" onChange={(event) => props.onUpdate(group.id, { pattern: event.target.value })} />
              <button className="btn h-8 w-8 p-0" onClick={() => props.onDelete(group.id)}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
      <button className="btn mt-3 w-full border-dashed" onClick={props.onAdd}><Plus className="h-4 w-4" />添加{props.title.replace("代理组", "组")}</button>
    </AdvancedSection>
  );
}

function Preview({ generated, previewMode }: { generated: GeneratedConfig | null; previewMode: "visual" | "yaml" }) {
  if (!generated) return <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/10 bg-white/[0.025] text-[12px] text-white/35"><ListTree className="h-9 w-9 text-white/25" />添加节点后显示预览</div>;
  if (previewMode === "yaml") {
    return <pre className="max-h-[540px] overflow-auto rounded-lg border border-white/10 bg-black/35 p-4 text-xs leading-relaxed text-white/80">{generated.yaml}</pre>;
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] text-white/50">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-400" />核心</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />常用</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-violet-400" />社交</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />技术</span>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-white/[0.035] p-2">
        <PreviewStat label="节点" value={generated.nodeCount} color="text-blue-300" />
        <PreviewStat label="代理组" value={generated.proxyGroupCount} color="text-emerald-300" />
        <PreviewStat label="规则集" value={generated.ruleCount} color="text-violet-300" />
      </div>

      <div className="space-y-1.5 rounded-lg border border-white/10 bg-black/20 p-2">
        {generated.groups.map((group) => (
          <PreviewGroupRow key={group.name} group={group} />
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[12px] text-white/55">
          <span className="inline-flex items-center gap-2"><Network className="h-4 w-4" />节点列表</span>
          <span>共 {generated.nodes.length} 个</span>
        </div>
        <div className="max-h-64 overflow-auto">
          {generated.nodes.map((node) => (
            <div key={node.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/[0.06] px-3 py-2 last:border-0 hover:bg-white/[0.04]">
              <div className="min-w-0">
                <div className="truncate text-[12px] text-white/78">{node.name}</div>
                <div className="truncate text-[10px] text-white/35">{node.server || "未显示服务器"}{node.port ? `:${node.port}` : ""}</div>
              </div>
              <ProtocolBadge type={node.type} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewStat({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="rounded-md bg-white/[0.055] px-3 py-3 text-center"><div className={cn("text-xl font-bold leading-none", color)}>{value}</div><div className="mt-1 text-[10px] text-white/45">{label}</div></div>;
}

function PreviewGroupRow({ group }: { group: GeneratedConfig["groups"][number] }) {
  const accent = previewGroupAccent(group.name);
  return (
    <div className={cn("grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border px-2.5 py-2", accent.row)}>
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/8 text-[14px]">{group.icon}</span>
      <div className="min-w-0">
        <div className="truncate text-[12px] font-medium text-white/88">{group.name}</div>
        <div className="truncate text-[10px] text-white/45">{group.description} · 默认：{group.defaultTarget}</div>
      </div>
      <span className={cn("rounded-full px-2 py-0.5 text-[10px] uppercase", accent.badge)}>{group.type}</span>
    </div>
  );
}

function ProtocolBadge({ type }: { type: string }) {
  const normalized = type.toLowerCase();
  const color = normalized === "trojan" ? "border-rose-400/30 bg-rose-500/20 text-rose-100" :
    normalized === "vless" ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-100" :
    normalized === "vmess" ? "border-violet-400/30 bg-violet-500/20 text-violet-100" :
    normalized === "ss" ? "border-sky-400/30 bg-sky-500/20 text-sky-100" :
    "border-white/15 bg-white/10 text-white/70";
  return <span className={cn("rounded-md border px-2 py-1 text-[10px] font-semibold uppercase", color)}>{type}</span>;
}

function previewGroupAccent(name: string) {
  if (/(AI|Gemini|油管|谷歌|微软|苹果|视频|服务)/.test(name)) {
    return { row: "border-emerald-400/20 bg-emerald-500/12", badge: "bg-emerald-400/15 text-emerald-100" };
  }
  if (/(Telegram|GitHub|Steam|开发|下载|技术)/i.test(name)) {
    return { row: "border-cyan-400/20 bg-cyan-500/12", badge: "bg-cyan-400/15 text-cyan-100" };
  }
  if (/(广告|REJECT)/.test(name)) {
    return { row: "border-rose-400/20 bg-rose-500/12", badge: "bg-rose-400/15 text-rose-100" };
  }
  if (/(国内|私有|中国|DIRECT)/.test(name)) {
    return { row: "border-blue-400/20 bg-blue-500/12", badge: "bg-blue-400/15 text-blue-100" };
  }
  return { row: "border-indigo-400/20 bg-indigo-500/12", badge: "bg-indigo-400/15 text-indigo-100" };
}

function SourceDialog({ source, onClose, onSave }: { source: ImportSource; onClose: () => void; onSave: (source: ImportSource) => void }) {
  const [draft, setDraft] = useState(source);
  const previewName = (draft.nameTemplate?.trim() || "[{tag}]{name}")
    .replaceAll("{tag}", draft.tag || "A")
    .replaceAll("{name}", "节点名称");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="panel w-full max-w-xl rounded-xl p-5">
        <h3 className="inline-flex items-center gap-2 text-[15px] font-semibold">{sourceIcon(draft.type)}高级编辑：{labelFor(draft.type)}</h3>
        <label className="mt-4 block text-[12px] text-white/60">标签（tag）</label>
        <input className="input mt-2" placeholder="例如：A / 订阅1 / 自建1" value={draft.tag || ""} onChange={(event) => setDraft({ ...draft, tag: event.target.value })} />
        <label className="mt-4 block text-[12px] text-white/60">节点命名模板</label>
        <input className="input mt-2" placeholder="[{tag}]{name}" value={draft.nameTemplate || ""} onChange={(event) => setDraft({ ...draft, nameTemplate: event.target.value })} />
        <div className="mt-2 text-xs text-white/40">可用占位符：{"{tag}"}、{"{name}"}；预览：{previewName}</div>
        <textarea className="input mt-4 min-h-36" value={draft.value} placeholder={optionFor(draft.type).placeholder} onChange={(event) => setDraft({ ...draft, value: event.target.value })} />
        <div className="mt-5 flex justify-end gap-3">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => onSave(draft)}>完成</button>
        </div>
      </div>
    </div>
  );
}

function SubscriptionDialog({
  settings,
  creating,
  editing,
  existingUrl,
  onClose,
  onChange,
  onConfirm
}: {
  settings: SubscriptionSettings;
  creating: boolean;
  editing?: boolean;
  existingUrl?: string | null;
  onClose: () => void;
  onChange: (settings: SubscriptionSettings) => void;
  onConfirm: (settings: SubscriptionSettings) => void;
}) {
  function patch(patchValue: Partial<SubscriptionSettings>) {
    onChange({ ...settings, ...patchValue });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="panel w-full max-w-[640px] rounded-2xl p-7 shadow-[0_24px_90px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="inline-flex items-center gap-3 text-2xl font-bold"><Link2 className="h-8 w-8 text-indigo-300" />{editing ? "保存订阅配置" : "生成订阅链接"}</h3>
            <p className="mt-2 text-[14px] text-white/50">
              {editing ? "保存后沿用原订阅地址，只更新配置内容。" : "生成持久化的订阅链接，支持在 Clash 客户端中自动更新。"}
            </p>
          </div>
          <button className="btn h-10 w-10 p-0" onClick={onClose} aria-label="关闭"><X className="h-5 w-5" /></button>
        </div>

        {editing && existingUrl && (
          <div className="mt-5 rounded-xl border border-blue-400/25 bg-blue-500/12 p-3 text-[13px] text-blue-100">
            当前订阅地址保持不变：{typeof window === "undefined" ? existingUrl : `${window.location.origin}${existingUrl}`}
          </div>
        )}

        <label className="mt-7 block text-[14px] font-medium text-white/75">订阅名称</label>
        <input className="input mt-2 h-14 rounded-xl px-5 text-[18px] font-semibold" value={settings.name} onChange={(event) => patch({ name: event.target.value })} />

        <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-white/[0.045]">
          <SubscriptionOption
            title="更新时智能匹配节点"
            description="刷新订阅时结合节点名称和参数识别同一节点，尽量保留节点顺序、改名和相关配置。"
            checked={settings.smartMatchNodes}
            onToggle={() => patch({ smartMatchNodes: !settings.smartMatchNodes })}
            icon={<HelpCircle className="h-5 w-5" />}
          />
          <div className="border-t border-white/10" />
          <SubscriptionOption
            title="启用自动更新"
            description="关闭时订阅链接返回本次生成的静态 YAML；开启后客户端拉取时重新抓取订阅源。"
            checked={settings.autoUpdate}
            onToggle={() => patch({ autoUpdate: !settings.autoUpdate })}
          />
          {settings.autoUpdate && (
            <div className="border-t border-white/10 px-5 py-4">
              <label className="block text-[15px] font-medium text-white/85">自动更新间隔（小时）</label>
              <input
                className="input mt-2 h-12 rounded-xl px-4 text-[17px] font-semibold"
                min={1}
                type="number"
                value={settings.updateIntervalHours}
                onChange={(event) => patch({ updateIntervalHours: Math.max(1, Number(event.target.value) || 24) })}
              />
              <div className="mt-2 text-[12px] text-white/42">最小 1 小时，按创建时间和上次刷新时间计时。</div>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-amber-400/25 bg-amber-500/12 p-4 text-[13px] leading-7 text-amber-100">
          <div className="mb-1 text-[15px] font-semibold text-amber-200">注意事项</div>
          <div className="flex items-center gap-2"><Shield className="h-4 w-4" />配置数据将保存到本地 SQLite 数据库</div>
          <div className="flex items-center gap-2"><Key className="h-4 w-4" />订阅链接相当于访问凭证，请勿公开分享</div>
          <div className="flex items-center gap-2"><Gauge className="h-4 w-4" />客户端高频拉取订阅可能造成源站限流，请合理配置</div>
          <div className="flex items-center gap-2"><Trash2 className="h-4 w-4" />可在仪表盘中删除订阅，使链接失效</div>
        </div>

        <div className="mt-7 flex justify-end gap-3">
          <button className="btn h-12 px-6 text-[15px]" onClick={onClose}>取消</button>
          <button className="btn btn-primary h-12 px-7 text-[15px]" disabled={!settings.name.trim() || creating} onClick={() => onConfirm({ ...settings, name: settings.name.trim() })}>
            {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Link2 className="h-5 w-5" />}
            {editing ? "保存订阅" : "生成链接"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SubscriptionOption({ title, description, checked, onToggle, icon }: { title: string; description: string; checked: boolean; onToggle: () => void; icon?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-4">
      <div>
        <div className="inline-flex items-center gap-2 text-[15px] font-medium text-white/85">{title}{icon ? <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/65">{icon}</span> : null}</div>
        <div className="mt-1 text-[12px] text-white/42">{description}</div>
      </div>
      <button className={cn("h-8 w-14 rounded-full border p-1 transition", checked ? "border-indigo-300/50 bg-indigo-500" : "border-white/20 bg-white/15")} onClick={onToggle} aria-pressed={checked}>
        <span className={cn("block h-6 w-6 rounded-full bg-white shadow transition", checked ? "translate-x-6" : "translate-x-0")} />
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3 text-center"><div className="text-xl font-bold leading-tight">{value}</div><div className="text-[11px] text-white/45">{label}</div></div>;
}

function tabClass(active: boolean) {
  return cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] transition", active ? "bg-white/12 text-white" : "text-white/50 hover:text-white");
}

function sourceIcon(type: SourceType) {
  if (type === "subscription_url") return <Link2 className="h-[18px] w-[18px] stroke-[2.2]" />;
  if (type === "yaml") return <FileText className="h-[18px] w-[18px] stroke-[2.2]" />;
  return <ListTree className="h-[18px] w-[18px] stroke-[2.2]" />;
}

function optionFor(type: SourceType) {
  return sourceOptions.find((option) => option.type === type)!;
}

function labelFor(type: SourceType) {
  return optionFor(type).label;
}

function hasSourceContent(source: ImportSource) {
  return Boolean(source.value.trim() || source.resolvedValue?.trim());
}

function applyAdvancedSettings(base: GeneratedConfig, settings: AdvancedSettings, nodes: ProxyNode[]): GeneratedConfig {
  const doc = (parseYaml(base.yaml) || {}) as Record<string, unknown>;
  const disabledGroups = new Set(settings.disabledGroupNames);
  const nodeNames = nodes.map((node) => node.name);

  doc["mixed-port"] = settings.mixedPort;
  doc["allow-lan"] = settings.allowLan;

  const dns = (typeof doc.dns === "object" && doc.dns ? doc.dns : {}) as Record<string, unknown>;
  dns["enhanced-mode"] = settings.dnsMode;
  doc.dns = dns;

  const sniffer = (typeof doc.sniffer === "object" && doc.sniffer ? doc.sniffer : {}) as Record<string, unknown>;
  sniffer.enable = settings.sniffer;
  doc.sniffer = sniffer;

  const proxyGroups = Array.isArray(doc["proxy-groups"]) ? [...doc["proxy-groups"]] as Array<Record<string, unknown>> : [];
  const enabledProxyGroups = proxyGroups.filter((group) => !disabledGroups.has(String(group.name || "")));
  for (const group of settings.filterGroups) {
    const proxies = matchNodeNames(nodes, group.pattern);
    enabledProxyGroups.push({ name: group.name || "筛选组", type: "select", proxies: proxies.length ? proxies : nodeNames });
  }
  for (const group of settings.relayGroups) {
    const proxies = matchNodeNames(nodes, group.pattern);
    enabledProxyGroups.push({ name: group.name || "中转组", type: "relay", proxies: proxies.slice(0, 2).length >= 2 ? proxies.slice(0, 2) : nodeNames.slice(0, 2) });
  }
  doc["proxy-groups"] = enabledProxyGroups;

  const ruleProviders = (typeof doc["rule-providers"] === "object" && doc["rule-providers"] ? doc["rule-providers"] : {}) as Record<string, Record<string, unknown>>;
  for (const provider of Object.values(ruleProviders)) {
    if (typeof provider.url === "string") provider.url = rewriteRuleUrl(provider.url, settings.ruleBaseUrl);
  }
  doc["rule-providers"] = ruleProviders;

  const customRules = settings.customRules.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rules = Array.isArray(doc.rules) ? doc.rules.map(String) : [];
  const filteredRules = rules.filter((rule) => ![...disabledGroups].some((group) => rule.endsWith(`,${group}`) || rule.includes(`,${group},`)));
  const matchIndex = filteredRules.findIndex((rule) => rule.startsWith("MATCH,"));
  if (customRules.length) {
    if (matchIndex >= 0) filteredRules.splice(matchIndex, 0, ...customRules);
    else filteredRules.push(...customRules);
  }
  doc.rules = filteredRules;

  const groups = base.groups
    .filter((group) => !disabledGroups.has(group.name))
    .concat(settings.filterGroups.map((group) => ({ name: group.name || "筛选组", type: "select", defaultTarget: "按筛选规则匹配节点", icon: "🔎", description: group.pattern || "筛选代理组" })))
    .concat(settings.relayGroups.map((group) => ({ name: group.name || "中转组", type: "relay", defaultTarget: "链式代理", icon: "🔗", description: group.pattern || "中转代理组" })));

  return {
    ...base,
    yaml: stringifyYaml(doc, { lineWidth: 0 }),
    proxyGroupCount: enabledProxyGroups.length,
    ruleCount: filteredRules.length,
    groups
  };
}

function matchNodeNames(nodes: ProxyNode[], pattern: string) {
  const tokens = pattern.split(/[|,，\s]+/).map((token) => token.trim().toLowerCase()).filter(Boolean);
  if (!tokens.length) return nodes.map((node) => node.name);
  return nodes.filter((node) => {
    const text = `${node.name} ${node.type} ${node.server || ""}`.toLowerCase();
    return tokens.some((token) => text.includes(token));
  }).map((node) => node.name);
}

function rewriteRuleUrl(url: string, baseUrl: string) {
  const base = baseUrl.trim().replace(/\/$/, "");
  if (!base) return url;
  const marker = "/meta/geo/";
  const index = url.indexOf(marker);
  if (index < 0) return url;
  return `${base}/${url.slice(index + marker.length)}`;
}

function summarizeAdvancedYaml(input: string): GeneratedConfig {
  const parsed = parseYamlNodes(input);
  const doc = parseYaml(input) as { "proxy-groups"?: Array<Record<string, unknown>>; rules?: unknown[] } | null;
  const groups = Array.isArray(doc?.["proxy-groups"])
    ? doc["proxy-groups"].map((group) => ({
        name: String(group.name || "未命名代理组"),
        type: String(group.type || "select"),
        defaultTarget: Array.isArray(group.proxies) && group.proxies.length > 0 ? String(group.proxies[0]) : "DIRECT",
        icon: "⚙️",
        description: "高级模式导入的代理组"
      }))
    : [];
  return {
    yaml: input,
    nodeCount: parsed.nodes.length,
    proxyGroupCount: groups.length,
    ruleCount: Array.isArray(doc?.rules) ? doc.rules.length : 0,
    groups,
    nodes: parsed.nodes
  };
}
