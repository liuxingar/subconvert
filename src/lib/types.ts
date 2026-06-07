export type SourceType = "subscription_url" | "yaml" | "node_links";

export type ImportSource = {
  id: string;
  type: SourceType;
  value: string;
  resolvedValue?: string;
  tag?: string;
  nameTemplate?: string;
};

export type ProxyNode = {
  id: string;
  name: string;
  type: string;
  server?: string;
  port?: number;
  raw: Record<string, unknown>;
};

export type RuleProvider = {
  name: string;
  behavior: "domain" | "ipcidr" | "classical";
  url: string;
  path: string;
  format?: "mrs" | "yaml" | "text";
};

export type ProxyGroupTemplate = {
  name: string;
  icon: string;
  type: "select" | "url-test" | "fallback" | "load-balance";
  description: string;
  includeNodes?: boolean;
  includeAuto?: boolean;
  fixedProxies?: string[];
  defaultTarget?: string;
  url?: string;
  interval?: number;
  ruleProviderNames?: string[];
};

export type TemplateConfig = {
  id: string;
  name: string;
  description: string;
  proxyGroupCount: number;
  ruleCount: number;
  downloads: number;
  likes: number;
  createdAt: string;
  isOfficial: boolean;
  groups: ProxyGroupTemplate[];
  ruleProviders: RuleProvider[];
};

export type GeneratedConfig = {
  yaml: string;
  nodeCount: number;
  proxyGroupCount: number;
  ruleCount: number;
  groups: Array<{
    name: string;
    type: string;
    defaultTarget: string;
    icon: string;
    description: string;
  }>;
  nodes: ProxyNode[];
};

export type Article = {
  id: string;
  title: string;
  category: "faq" | "guide" | "tutorial" | "bug";
  order: number;
  content: string;
};
