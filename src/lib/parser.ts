import { parse as parseYaml } from "yaml";
import type { ImportSource, ProxyNode } from "@/lib/types";

export type ParseResult = {
  nodes: ProxyNode[];
  errors: string[];
};

export function parseSources(sources: ImportSource[]): ParseResult {
  const errors: string[] = [];
  const nodes: ProxyNode[] = [];

  for (const source of sources) {
    if (!source.value.trim()) continue;
    const result =
      source.type === "yaml"
        ? parseYamlNodes(source.value)
      : source.type === "node_links"
          ? parseNodeLinks(source.value)
          : source.resolvedValue
            ? parseSubscriptionText(source.resolvedValue)
            : { nodes: [], errors: ["请先点击“导入此源”抓取订阅内容"] };

    errors.push(...result.errors.map((error) => `${sourceLabel(source)}: ${error}`));
    nodes.push(...result.nodes.map((node) => renameNode(node, source)));
  }

  return { nodes: dedupeNodes(nodes), errors };
}

export function parseSubscriptionText(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { nodes: [], errors: [] };

  if (looksLikeYaml(trimmed)) return parseYamlNodes(trimmed);

  const decoded = tryDecodeBase64(trimmed);
  if (decoded && decoded !== trimmed) {
    if (looksLikeYaml(decoded)) return parseYamlNodes(decoded);
    return parseNodeLinks(decoded);
  }

  return parseNodeLinks(trimmed);
}

export function parseYamlNodes(input: string): ParseResult {
  try {
    const doc = parseYaml(input) as { proxies?: unknown };
    if (!doc || !Array.isArray(doc.proxies)) {
      return { nodes: [], errors: ["YAML 中没有 proxies 数组"] };
    }

    const nodes = doc.proxies
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((proxy, index) => normalizeProxy(proxy, `yaml-${index}`))
      .filter((node): node is ProxyNode => Boolean(node));

    return { nodes, errors: nodes.length ? [] : ["proxies 数组为空或节点格式不受支持"] };
  } catch (error) {
    return { nodes: [], errors: [`YAML 解析失败：${error instanceof Error ? error.message : "未知错误"}`] };
  }
}

export function parseNodeLinks(input: string): ParseResult {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const nodes: ProxyNode[] = [];
  const errors: string[] = [];

  for (const line of lines) {
    try {
      const node = parseNodeLink(line);
      if (node) nodes.push(node);
      else errors.push(`暂不支持的节点链接：${line.slice(0, 36)}`);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `节点解析失败：${line.slice(0, 36)}`);
    }
  }

  return { nodes, errors };
}

function parseNodeLink(link: string): ProxyNode | null {
  if (link.startsWith("ss://")) return parseShadowsocks(link);
  if (link.startsWith("vmess://")) return parseVmess(link);
  if (/^(vless|trojan|hysteria2|hy2|tuic|anytls|socks5|socks4|http|https|ssh):\/\//.test(link)) {
    return parseGenericUrl(link);
  }
  return null;
}

function parseShadowsocks(link: string): ProxyNode {
  const withoutScheme = link.slice("ss://".length);
  const [beforeHash, hashName] = withoutScheme.split("#");
  const [main, query = ""] = beforeHash.split("?");
  const decodedName = hashName ? decodeURIComponent(hashName) : "SS 节点";

  let userInfo = main;
  let hostPart = "";
  if (main.includes("@")) {
    [userInfo, hostPart] = main.split("@");
    userInfo = tryDecodeBase64Any(userInfo) || userInfo;
  } else {
    const decodedMain = tryDecodeBase64Any(main) || main;
    if (decodedMain.includes("@")) [userInfo, hostPart] = decodedMain.split("@");
    else userInfo = decodedMain;
  }

  const [cipher, password] = userInfo.split(":");
  const [server, portValue] = hostPart.split(":");
  const plugin = new URLSearchParams(query).get("plugin");

  return {
    id: stableId(link),
    name: decodedName,
    type: "ss",
    server,
    port: Number(portValue) || undefined,
    raw: {
      name: decodedName,
      type: "ss",
      server,
      port: Number(portValue) || 0,
      cipher: cipher || "aes-128-gcm",
      password: password || "",
      plugin: plugin || undefined,
      udp: true
    }
  };
}

function parseVmess(link: string): ProxyNode {
  const payload = tryDecodeBase64Any(link.slice("vmess://".length));
  if (!payload) throw new Error("vmess 链接不是有效 Base64");
  const data = JSON.parse(payload) as Record<string, unknown>;
  const name = String(data.ps || data.name || "VMess 节点");
  const server = String(data.add || data.server || "");
  const port = Number(data.port || 0);
  const network = String(data.net || "tcp");
  const host = String(data.host || "");
  const path = String(data.path || "/");
  const tls = String(data.tls || "") === "tls";
  return {
    id: stableId(link),
    name,
    type: "vmess",
    server,
    port,
    raw: {
      name,
      type: "vmess",
      server,
      port,
      uuid: data.id,
      alterId: Number(data.aid || 0),
      cipher: data.scy || "auto",
      tls,
      network,
      udp: true,
      servername: data.sni || host || undefined,
      "ws-opts": network === "ws" ? { path, headers: host ? { Host: host } : undefined } : undefined
    }
  };
}

function parseGenericUrl(link: string): ProxyNode {
  const url = new URL(link.replaceAll("&amp;", "&"));
  const type = url.protocol.replace(":", "").replace("hy2", "hysteria2");
  const name = decodeURIComponent(url.hash.replace(/^#/, "")) || `${type.toUpperCase()} 节点`;
  const username = decodeURIComponent(url.username || "");
  const password = decodeURIComponent(url.password || "");
  const transport = url.searchParams.get("type") || "tcp";
  const security = url.searchParams.get("security") || "";
  const sni = url.searchParams.get("sni") || "";
  const host = url.searchParams.get("host") || "";
  const path = url.searchParams.get("path") || "/";
  const raw: Record<string, unknown> = {
    name,
    type,
    server: url.hostname,
    port: Number(url.port || 0),
    udp: true
  };

  if (type === "trojan") raw.password = username || password;
  if (type === "vless") {
    raw.uuid = username;
    raw.encryption = url.searchParams.get("encryption") || "none";
  }
  if (type === "hysteria2") raw.password = username || password;
  if (type === "tuic") {
    raw.uuid = username;
    raw.password = password;
  }
  if (transport) raw.network = transport;
  if (sni && type === "vless") raw.servername = sni;
  if (sni && type !== "vless") raw.sni = sni;
  if (url.searchParams.get("allowInsecure") === "1" || url.searchParams.get("insecure") === "1") raw["skip-cert-verify"] = true;
  if (url.searchParams.get("flow")) raw.flow = url.searchParams.get("flow");
  if (security) raw.tls = security === "tls" || security === "reality";
  else if (type === "vless") raw.tls = false;
  if (url.searchParams.get("fp")) raw["client-fingerprint"] = url.searchParams.get("fp");
  else if (type === "trojan" || (type === "vless" && raw.tls)) raw["client-fingerprint"] = "chrome";
  if (url.searchParams.get("alpn")) raw.alpn = url.searchParams.get("alpn")!.split(",").filter(Boolean);
  if (url.searchParams.get("ech")) raw["ech-opts"] = { enable: true };
  if (transport === "ws") {
    raw["ws-opts"] = {
      path,
      headers: host ? { Host: host } : undefined
    };
  }
  if (security === "reality") {
    raw["reality-opts"] = {
      "public-key": url.searchParams.get("pbk") || undefined,
      "short-id": url.searchParams.get("sid") || undefined,
      "spider-x": url.searchParams.get("spx") || undefined
    };
  }

  return {
    id: stableId(link),
    name,
    type,
    server: url.hostname,
    port: Number(url.port || 0),
    raw
  };
}

function normalizeProxy(proxy: Record<string, unknown>, fallbackId: string): ProxyNode | null {
  const name = String(proxy.name || "").trim();
  const type = String(proxy.type || "").trim();
  if (!name || !type) return null;
  return {
    id: stableId(`${fallbackId}:${name}:${type}:${String(proxy.server || "")}:${String(proxy.port || "")}`),
    name,
    type,
    server: proxy.server ? String(proxy.server) : undefined,
    port: proxy.port ? Number(proxy.port) : undefined,
    raw: { ...proxy }
  };
}

function renameNode(node: ProxyNode, source: ImportSource): ProxyNode {
  const tag = source.tag?.trim();
  if (!tag) return node;
  const template = source.nameTemplate?.trim() || "[{tag}]{name}";
  const name = template.replaceAll("{tag}", tag).replaceAll("{name}", node.name);
  return {
    ...node,
    name,
    raw: { ...node.raw, name }
  };
}

function dedupeNodes(nodes: ProxyNode[]) {
  const uniqueNodes: ProxyNode[] = [];
  const preferredVmessKeys = new Set(
    nodes
      .filter((node) => node.type === "vmess" && Boolean(node.raw.uuid) && node.server && !isIpAddress(node.server))
      .map((node) => vmessFamilyKey(node))
  );
  const fingerprints = new Set<string>();
  for (const node of nodes) {
    if (
      node.type === "vmess" &&
      node.server &&
      isIpAddress(node.server) &&
      preferredVmessKeys.has(vmessFamilyKey(node))
    ) {
      continue;
    }
    const fingerprint = nodeFingerprint(node);
    if (fingerprints.has(fingerprint)) continue;
    fingerprints.add(fingerprint);
    uniqueNodes.push(node);
  }

  const seen = new Map<string, number>();
  return uniqueNodes.map((node) => {
    const count = seen.get(node.name) || 0;
    seen.set(node.name, count + 1);
    if (count === 0) return node;
    const name = `${node.name} (${count + 1})`;
    return { ...node, name, raw: { ...node.raw, name } };
  });
}

function nodeFingerprint(node: ProxyNode) {
  const raw = { ...node.raw };
  delete raw.name;
  return stableStringify(raw);
}

function vmessFamilyKey(node: ProxyNode) {
  return [
    node.type,
    String(node.raw.uuid || ""),
    String(node.raw.port || node.port || ""),
    String(node.raw.network || ""),
    String(node.raw.tls || false)
  ].join("|");
}

function isIpAddress(value: string) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) || /^[0-9a-f:]+$/i.test(value);
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

function sourceLabel(source: ImportSource) {
  if (source.type === "subscription_url") return "订阅链接";
  if (source.type === "yaml") return "YAML 配置";
  return "节点链接";
}

function looksLikeYaml(text: string) {
  return /(^|\n)\s*proxies\s*:/.test(text) || /(^|\n)\s*proxy-groups\s*:/.test(text);
}

function tryDecodeBase64(value: string) {
  const decoded = tryDecodeBase64Any(value);
  return decoded && (decoded.includes("://") || looksLikeYaml(decoded)) ? decoded : null;
}

function tryDecodeBase64Any(value: string) {
  try {
    const normalized = value.replace(/\s/g, "");
    if (!/^[A-Za-z0-9+/=_-]+$/.test(normalized)) return null;
    const base64 = normalized.replace(/-/g, "+").replace(/_/g, "/");
    const decoded =
      typeof Buffer !== "undefined"
        ? Buffer.from(base64, "base64").toString("utf8")
        : decodeURIComponent(escape(window.atob(base64)));
    return decoded;
  } catch {
    return null;
  }
}

function stableId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return `node-${Math.abs(hash).toString(36)}`;
}
