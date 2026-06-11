import { getTemplate } from "@/data/templates";
import { applyAdvancedSettings, normalizeAdvancedSettings } from "@/lib/advancedConfig";
import { parseAppTimestampMs } from "@/lib/date";
import { generateConfig } from "@/lib/generator";
import { parseSources, parseYamlNodes } from "@/lib/parser";
import { safeFetchText } from "@/lib/safeFetch";
import type { ImportSource, ProxyNode } from "@/lib/types";

export type StoredSubscriptionConfig = {
  templateId: string;
  sources: ImportSource[];
  yaml?: string;
  mode?: "quick" | "advanced";
  advancedYaml?: string;
  advancedSettings?: Record<string, unknown>;
  settings?: {
    smartMatchNodes?: boolean;
    autoUpdate?: boolean;
    updateIntervalHours?: number;
  };
};

export function parseStoredSubscriptionConfig(configJson: string): StoredSubscriptionConfig {
  try {
    const config = JSON.parse(configJson) as StoredSubscriptionConfig;
    return normalizeStoredSubscriptionConfig(config);
  } catch {
    return { templateId: "builtin-minimal", sources: [], settings: normalizeSubscriptionSettings(undefined) };
  }
}

export function normalizeStoredSubscriptionConfig(config: StoredSubscriptionConfig): StoredSubscriptionConfig {
  return {
    templateId: config.templateId || "builtin-minimal",
    sources: normalizeImportSources(config.sources),
    yaml: normalizeSubscriptionYaml(config.yaml),
    mode: config.mode === "advanced" ? "advanced" : "quick",
    advancedYaml: normalizeSubscriptionYaml(config.advancedYaml),
    advancedSettings: normalizeAdvancedSettings(config.advancedSettings),
    settings: normalizeSubscriptionSettings(config.settings)
  };
}

export function normalizeSubscriptionSettings(settings: StoredSubscriptionConfig["settings"]) {
  return {
    smartMatchNodes: settings?.smartMatchNodes !== false,
    autoUpdate: settings?.autoUpdate === true,
    updateIntervalHours: Math.max(1, Number(settings?.updateIntervalHours) || 24)
  };
}

export function shouldUseSubscriptionCache(config: StoredSubscriptionConfig, cachedAt: string | null, now = Date.now()) {
  if (config.settings?.autoUpdate !== true || !cachedAt) return false;
  const cachedTime = parseAppTimestampMs(cachedAt);
  if (!Number.isFinite(cachedTime)) return false;
  return now - cachedTime < getUpdateIntervalMs(config);
}

export function isSubscriptionRefreshDue(config: StoredSubscriptionConfig, timestamps: { cachedAt: string | null; lastRefreshAttemptAt?: string | null; createdAt: string }, now = Date.now()) {
  if (config.settings?.autoUpdate !== true) return false;
  if (!timestamps.cachedAt && !timestamps.lastRefreshAttemptAt) return true;
  const baseline = latestTimestamp([timestamps.cachedAt, timestamps.lastRefreshAttemptAt, timestamps.createdAt]);
  if (!baseline) return true;
  return now - baseline >= getUpdateIntervalMs(config);
}

export async function renderSubscriptionYaml(config: StoredSubscriptionConfig) {
  if (config.settings?.autoUpdate === false && config.yaml) return config.yaml;

  const resolvedSources: ImportSource[] = [];

  for (const source of config.sources) {
    if (!source.value.trim()) continue;
    if (source.type === "subscription_url") {
      resolvedSources.push({ ...source, resolvedValue: await safeFetchText(source.value) });
    } else {
      resolvedSources.push(source);
    }
  }

  const { nodes, errors } = parseSources(resolvedSources);
  if (nodes.length === 0 && config.yaml) return config.yaml;
  if (nodes.length === 0) throw new Error(errors[0] || "订阅没有可用节点");
  const matchedNodes = config.settings?.smartMatchNodes !== false ? smartMatchNodes(nodes, config.yaml) : nodes;
  const base = generateConfig(matchedNodes, getTemplate(config.templateId));
  return config.mode === "advanced" ? applyAdvancedSettings(base, config.advancedSettings, matchedNodes).yaml : base.yaml;
}

export function normalizeImportSources(input: unknown): ImportSource[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 20).flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const source = item as Partial<ImportSource>;
    const type = source.type === "yaml" || source.type === "node_links" || source.type === "subscription_url" ? source.type : null;
    if (!type) return [];
    const maxValueLength = type === "subscription_url" ? 4096 : 2 * 1024 * 1024;
    const value = String(source.value || "").trim().slice(0, maxValueLength);
    if (!value) return [];
    return [{
      id: String(source.id || `source-${index}`).slice(0, 80),
      type,
      value,
      tag: source.tag ? String(source.tag).slice(0, 80) : undefined,
      nameTemplate: source.nameTemplate ? String(source.nameTemplate).slice(0, 200) : undefined
    }];
  });
}

export function normalizeSubscriptionYaml(input: unknown) {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  return trimmed ? trimmed.slice(0, 2 * 1024 * 1024) : undefined;
}

export function validateSubscriptionYaml(yaml: string | undefined) {
  if (!yaml) return null;
  const parsed = parseYamlNodes(yaml);
  if (parsed.nodes.length > 0) return null;
  return parsed.errors[0] || "生成的 YAML 中没有有效节点";
}

function getUpdateIntervalMs(config: StoredSubscriptionConfig) {
  return Math.max(1, Number(config.settings?.updateIntervalHours) || 24) * 60 * 60 * 1000;
}

function latestTimestamp(values: Array<string | null | undefined>) {
  const times = values
    .map((value) => parseAppTimestampMs(value))
    .filter((value) => Number.isFinite(value));
  return times.length ? Math.max(...times) : 0;
}

function smartMatchNodes(nodes: ProxyNode[], previousYaml: string | undefined) {
  if (!previousYaml || nodes.length === 0) return nodes;
  const previousNodes = parseYamlNodes(previousYaml).nodes;
  if (previousNodes.length === 0) return nodes;

  const usedPreviousIndexes = new Set<number>();
  const matched = nodes.map((node, inputIndex) => {
    const matchIndex = findBestPreviousNode(node, previousNodes, usedPreviousIndexes);
    if (matchIndex < 0) return { node, inputIndex, order: Number.MAX_SAFE_INTEGER };
    usedPreviousIndexes.add(matchIndex);
    const previous = previousNodes[matchIndex];
    const renamed = { ...node, name: previous.name, raw: { ...node.raw, name: previous.name } };
    return { node: renamed, inputIndex, order: matchIndex };
  });

  return matched
    .sort((left, right) => left.order - right.order || left.inputIndex - right.inputIndex)
    .map((item) => item.node);
}

function findBestPreviousNode(node: ProxyNode, previousNodes: ProxyNode[], usedIndexes: Set<number>) {
  let bestIndex = -1;
  let bestScore = 0;
  const fingerprint = nodeFingerprint(node);
  const credential = credentialKey(node);
  const normalizedName = normalizeName(node.name);

  previousNodes.forEach((previous, index) => {
    if (usedIndexes.has(index)) return;
    let score = 0;
    if (nodeFingerprint(previous) === fingerprint) score += 120;
    if (credential && credentialKey(previous) === credential) score += 80;
    if (normalizeName(previous.name) === normalizedName) score += 45;
    if (sameText(previous.type, node.type)) score += 20;
    if (sameText(previous.server, node.server)) score += 25;
    if (Number(previous.port || previous.raw.port || 0) === Number(node.port || node.raw.port || 0)) score += 15;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= 80 ? bestIndex : -1;
}

function nodeFingerprint(node: ProxyNode) {
  const raw = { ...node.raw };
  delete raw.name;
  return stableStringify(raw);
}

function credentialKey(node: ProxyNode) {
  const keys = ["uuid", "password", "cipher", "network", "tls", "sni", "servername", "flow", "alterId"];
  const parts = keys
    .map((key) => [key, node.raw[key]] as const)
    .filter(([, value]) => value !== undefined && value !== "");
  if (parts.length === 0) return "";
  return `${node.type}|${stableStringify(Object.fromEntries(parts))}`;
}

function normalizeName(value: string | undefined) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function sameText(left: unknown, right: unknown) {
  return String(left || "").toLowerCase() === String(right || "").toLowerCase();
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined && item !== "")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
