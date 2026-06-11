import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { GeneratedConfig, ProxyNode } from "@/lib/types";

export type AdvancedProxyGroupDraft = {
  id: string;
  name: string;
  pattern: string;
};

export type AdvancedSettings = {
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

export const defaultAdvancedSettings: AdvancedSettings = {
  configName: "我的配置",
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

export function normalizeAdvancedSettings(input: unknown): AdvancedSettings {
  const value = input && typeof input === "object" ? input as Partial<AdvancedSettings> : {};
  return {
    ...defaultAdvancedSettings,
    ...value,
    mixedPort: Number.isFinite(Number(value.mixedPort)) ? Number(value.mixedPort) : defaultAdvancedSettings.mixedPort,
    allowLan: value.allowLan !== false,
    dnsMode: value.dnsMode === "redir-host" ? "redir-host" : "fake-ip",
    sniffer: value.sniffer !== false,
    disabledGroupNames: Array.isArray(value.disabledGroupNames) ? value.disabledGroupNames.map(String).slice(0, 50) : [],
    filterGroups: normalizeDraftGroups(value.filterGroups),
    relayGroups: normalizeDraftGroups(value.relayGroups)
  };
}

export function applyAdvancedSettings(base: GeneratedConfig, input: unknown, nodes: ProxyNode[]): GeneratedConfig {
  const settings = normalizeAdvancedSettings(input);
  const doc = (parseYaml(base.yaml) || {}) as Record<string, unknown>;
  const disabledGroups = new Set(settings.disabledGroupNames);
  const nodeNames = nodes.map((node) => node.name);

  doc["mixed-port"] = settings.mixedPort;
  doc["allow-lan"] = settings.allowLan;

  if (settings.monitorPort) {
    doc["external-controller"] = "127.0.0.1:9090";
  } else {
    delete doc["external-controller"];
  }

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

  const customRules = String(settings.customRules || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
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

function normalizeDraftGroups(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((item, index) => {
    const group = item && typeof item === "object" ? item as Partial<AdvancedProxyGroupDraft> : {};
    return {
      id: String(group.id || `group-${index}`),
      name: String(group.name || "").slice(0, 80),
      pattern: String(group.pattern || "").slice(0, 500)
    };
  });
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
