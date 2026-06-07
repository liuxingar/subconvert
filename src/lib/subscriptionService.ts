import { getTemplate } from "@/data/templates";
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
  return generateConfig(matchedNodes, getTemplate(config.templateId)).yaml;
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
