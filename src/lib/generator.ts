import { stringify } from "yaml";
import type { GeneratedConfig, ProxyNode, TemplateConfig } from "@/lib/types";

export function generateConfig(nodes: ProxyNode[], template: TemplateConfig): GeneratedConfig {
  const nodeNames = nodes.map((node) => node.name);
  const firstNode = nodeNames[0] || "DIRECT";

  const proxyGroups = template.groups.map((group) => {
    const proxies = unique([
      ...(group.includeAuto ? ["⚡ 自动选择"] : []),
      ...(group.fixedProxies || []),
      ...(group.includeNodes ? nodeNames : [])
    ]).filter((proxy) => group.name !== "⚡ 自动选择" || proxy !== "⚡ 自动选择");

    const output: Record<string, unknown> = {
      name: group.name,
      type: group.type,
      proxies: proxies.length ? proxies : ["DIRECT", "REJECT"]
    };

    if (group.type === "url-test") {
      output.url = group.url || "https://www.gstatic.com/generate_204";
      output.interval = group.interval || 300;
      output.lazy = false;
    }

    return output;
  });

  const ruleProviders: Record<string, unknown> = {};
  for (const provider of template.ruleProviders) {
    ruleProviders[provider.name] = {
      type: "http",
      behavior: provider.behavior,
      url: provider.url,
      path: provider.path,
      interval: 86400,
      format: provider.format || "mrs"
    };
  }

  const rules = buildRules(template);
  const config = {
    "mixed-port": 7897,
    "allow-lan": true,
    mode: "rule",
    "log-level": "info",
    "unified-delay": true,
    "tcp-concurrent": true,
    "find-process-mode": "strict",
    "global-client-fingerprint": "chrome",
    dns: {
      enable: true,
      listen: "127.0.0.1:5335",
      "use-system-hosts": false,
      "enhanced-mode": "fake-ip",
      "fake-ip-range": "198.18.0.1/16",
      "default-nameserver": ["180.76.76.76", "119.29.29.29", "8.8.8.8"],
      nameserver: [
        "223.5.5.5",
        "119.29.29.29",
        "https://dns.alidns.com/dns-query",
        "https://cloudflare-dns.com/dns-query",
        "https://doh.pub/dns-query"
      ],
      fallback: ["https://dns.google/dns-query", "tls://1.0.0.1:853"],
      "fallback-filter": {
        geoip: true,
        ipcidr: ["240.0.0.0/4", "0.0.0.0/32", "127.0.0.1/32"]
      },
      "fake-ip-filter": ["*.lan", "localhost", "time.windows.com", "*.ntp.org.cn"]
    },
    profile: {
      "store-selected": true,
      "store-fake-ip": false
    },
    sniffer: {
      enable: true,
      "parse-pure-ip": true,
      sniff: {
        TLS: { ports: [443, 8443] },
        HTTP: { ports: ["80", "8080-8880"], "override-destination": true },
        QUIC: { ports: [443, 8443] }
      }
    },
    proxies: nodes.map((node) => sanitizeNode(node.raw)),
    "proxy-groups": proxyGroups,
    "rule-providers": ruleProviders,
    rules
  };

  return {
    yaml: stringify(config, { lineWidth: 0 }),
    nodeCount: nodes.length,
    proxyGroupCount: proxyGroups.length,
    ruleCount: rules.length,
    groups: template.groups.map((group) => ({
      name: group.name,
      type: group.type,
      defaultTarget: resolveDefault(group.defaultTarget, firstNode),
      icon: group.icon,
      description: group.description
    })),
    nodes
  };
}

function buildRules(template: TemplateConfig) {
  const rules: string[] = [];
  const providerToGroup = new Map<string, string>();

  for (const group of template.groups) {
    for (const providerName of group.ruleProviderNames || []) {
      if (!providerToGroup.has(providerName)) providerToGroup.set(providerName, group.name);
    }
  }

  for (const provider of template.ruleProviders) {
    const target = providerToGroup.get(provider.name);
    if (!target) continue;
    const suffix = provider.behavior === "ipcidr" ? ",no-resolve" : "";
    rules.push(`RULE-SET,${provider.name},${target}${suffix}`);
  }

  rules.push("MATCH,🐟 漏网之鱼");
  return rules;
}

function resolveDefault(value: string | undefined, firstNode: string) {
  if (!value) return firstNode;
  if (value === "first-node") return firstNode;
  return value;
}

function sanitizeNode(raw: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== undefined && value !== ""));
}

function unique(values: string[]) {
  return [...new Set(values)];
}
