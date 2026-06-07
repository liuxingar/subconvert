import type { RuleProvider, TemplateConfig } from "@/lib/types";

const baseProviders: RuleProvider[] = [
  {
    name: "category-ads-all",
    behavior: "domain",
    url: "https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/category-ads-all.mrs",
    path: "./ruleset/category-ads-all.mrs",
    format: "mrs"
  },
  {
    name: "private",
    behavior: "domain",
    url: "https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/private.mrs",
    path: "./ruleset/private.mrs",
    format: "mrs"
  },
  {
    name: "private-ip",
    behavior: "ipcidr",
    url: "https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geoip/private.mrs",
    path: "./ruleset/private-ip.mrs",
    format: "mrs"
  },
  {
    name: "geolocation-cn",
    behavior: "domain",
    url: "https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/geolocation-cn.mrs",
    path: "./ruleset/geolocation-cn.mrs",
    format: "mrs"
  },
  {
    name: "cn-ip",
    behavior: "ipcidr",
    url: "https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geoip/cn.mrs",
    path: "./ruleset/cn-ip.mrs",
    format: "mrs"
  },
  {
    name: "geolocation-!cn",
    behavior: "domain",
    url: "https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/geolocation-!cn.mrs",
    path: "./ruleset/geolocation-!cn.mrs",
    format: "mrs"
  },
  {
    name: "cn",
    behavior: "domain",
    url: "https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/cn.mrs",
    path: "./ruleset/cn.mrs",
    format: "mrs"
  }
];

const coreGroups = [
  {
    name: "🚀 节点选择",
    icon: "🚀",
    type: "select" as const,
    description: "手动选择代理节点",
    includeAuto: true,
    includeNodes: true,
    fixedProxies: ["DIRECT", "REJECT"],
    defaultTarget: "⚡ 自动选择"
  },
  {
    name: "⚡ 自动选择",
    icon: "⚡",
    type: "url-test" as const,
    description: "自动选择最快节点",
    includeNodes: true,
    defaultTarget: "first-node",
    url: "https://www.gstatic.com/generate_204",
    interval: 300
  },
  {
    name: "🛑 广告拦截",
    icon: "🛑",
    type: "select" as const,
    description: "拦截广告和追踪器",
    fixedProxies: ["REJECT", "DIRECT", "🚀 节点选择"],
    defaultTarget: "REJECT",
    ruleProviderNames: ["category-ads-all"]
  },
  {
    name: "🏠 私有网络",
    icon: "🏠",
    type: "select" as const,
    description: "局域网和私有 IP 直连",
    includeAuto: true,
    includeNodes: true,
    fixedProxies: ["DIRECT", "REJECT", "🚀 节点选择"],
    defaultTarget: "DIRECT",
    ruleProviderNames: ["private", "private-ip"]
  },
  {
    name: "🔒 国内服务",
    icon: "🔒",
    type: "select" as const,
    description: "国内网站和服务直连",
    includeAuto: true,
    includeNodes: true,
    fixedProxies: ["DIRECT", "REJECT", "🚀 节点选择"],
    defaultTarget: "DIRECT",
    ruleProviderNames: ["geolocation-cn", "cn-ip", "cn"]
  },
  {
    name: "🌍 非中国",
    icon: "🌍",
    type: "select" as const,
    description: "非中国域名走代理",
    includeAuto: true,
    includeNodes: true,
    fixedProxies: ["🚀 节点选择", "DIRECT", "REJECT"],
    defaultTarget: "🚀 节点选择",
    ruleProviderNames: ["geolocation-!cn"]
  },
  {
    name: "🐟 漏网之鱼",
    icon: "🐟",
    type: "select" as const,
    description: "未匹配到任何规则的流量",
    includeAuto: true,
    includeNodes: true,
    fixedProxies: ["🚀 节点选择", "DIRECT", "REJECT"],
    defaultTarget: "🚀 节点选择"
  }
];

const serviceGroups = [
  ["🤖 AI 服务", "ChatGPT、Claude、Copilot 等"],
  ["✨ Gemini", "Google Gemini 等"],
  ["📹 油管视频", "YouTube 视频和音乐"],
  ["🔍 谷歌服务", "Google 搜索、Gmail、Drive、Play"],
  ["Ⓜ️ 微软服务", "Microsoft 365、Azure、Bing、OneDrive"],
  ["🍏 苹果服务", "iCloud、App Store、Apple Music"]
].map(([name, description]) => ({
  name,
  icon: name.split(" ")[0],
  type: "select" as const,
  description,
  includeAuto: true,
  includeNodes: true,
  fixedProxies: ["🚀 节点选择", "DIRECT", "REJECT"],
  defaultTarget: "🚀 节点选择"
}));

export const builtinTemplates: TemplateConfig[] = [
  {
    id: "builtin-minimal",
    name: "精简版",
    description: "基础代理组 + 国内外分流，适合轻度用户",
    proxyGroupCount: 7,
    ruleCount: 6,
    downloads: 13222,
    likes: 23,
    createdAt: "2026-01-01",
    isOfficial: true,
    groups: coreGroups,
    ruleProviders: baseProviders
  },
  {
    id: "builtin-standard",
    name: "标准版",
    description: "完整代理组 + 常用规则，满足大部分需求",
    proxyGroupCount: 14,
    ruleCount: 21,
    downloads: 8064,
    likes: 25,
    createdAt: "2026-01-01",
    isOfficial: true,
    groups: [...coreGroups, ...serviceGroups],
    ruleProviders: baseProviders
  },
  {
    id: "builtin-full",
    name: "完整版",
    description: "全部功能 + 扩展规则集，适合高级用户",
    proxyGroupCount: 33,
    ruleCount: 91,
    downloads: 15857,
    likes: 103,
    createdAt: "2026-01-01",
    isOfficial: true,
    groups: [
      ...coreGroups,
      ...serviceGroups,
      ...["Telegram", "Netflix", "Disney", "Steam", "GitHub", "金融服务", "开发工具", "下载服务"].map((name) => ({
        name,
        icon: "•",
        type: "select" as const,
        description: `${name} 分流组`,
        includeAuto: true,
        includeNodes: true,
        fixedProxies: ["🚀 节点选择", "DIRECT", "REJECT"],
        defaultTarget: "🚀 节点选择"
      }))
    ],
    ruleProviders: baseProviders
  }
];

export const plazaTemplates: TemplateConfig[] = [
  {
    ...builtinTemplates[2],
    id: "plaza-ai",
    name: "主力 AI 用配置优化",
    description: "AI 服务优先代理，国内服务直连",
    downloads: 51,
    likes: 0,
    createdAt: "2026-05-29",
    isOfficial: false
  },
  {
    ...builtinTemplates[1],
    id: "plaza-claudecode",
    name: "机场 + Claudecode",
    description: "适合开发工具和 AI 编程场景",
    downloads: 85,
    likes: 1,
    createdAt: "2026-04-14",
    isOfficial: false
  },
  {
    ...builtinTemplates[0],
    id: "plaza-steam",
    name: "Steam 优化",
    description: "游戏平台与常用下载直连优化",
    downloads: 23,
    likes: 0,
    createdAt: "2026-04-06",
    isOfficial: false
  }
];

export function getTemplate(id: string): TemplateConfig {
  return [...builtinTemplates, ...plazaTemplates].find((template) => template.id === id) ?? builtinTemplates[0];
}
