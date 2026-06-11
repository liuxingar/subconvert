import dns from "node:dns/promises";
import net from "node:net";

const blockedHosts = new Set(["localhost", "metadata.google.internal"]);
const maxBytes = 2 * 1024 * 1024;

export async function safeFetchText(input: string) {
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("仅支持 HTTP/HTTPS 订阅链接");
  if (blockedHosts.has(url.hostname.toLowerCase())) throw new Error("禁止访问本地或元数据地址");

  await assertPublicHost(url.hostname);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      redirect: "manual",
      headers: {
        "User-Agent": "SubBoostLocal/0.1"
      },
      signal: controller.signal
    });
    if (response.status >= 300 && response.status < 400) throw new Error("订阅链接重定向被拒绝，请使用最终 URL");
    if (!response.ok) throw new Error(`订阅请求失败：HTTP ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) return await response.text();

    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        size += value.byteLength;
        if (size > maxBytes) throw new Error("订阅内容超过 2MB 限制");
        chunks.push(value);
      }
    }
    return new TextDecoder().decode(Buffer.concat(chunks));
  } finally {
    clearTimeout(timer);
  }
}

async function assertPublicHost(hostname: string) {
  const literalType = net.isIP(hostname);
  if (literalType) {
    if (!isPublicIp(hostname)) throw new Error("禁止访问内网 IP");
    return;
  }

  const records = await dns.lookup(hostname, { all: true });
  if (records.length === 0) throw new Error("无法解析订阅域名");
  if (records.some((record) => !isPublicIp(record.address))) throw new Error("禁止访问解析到内网的地址");
}

function isPublicIp(ip: string) {
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) return isPublicIp(mapped[1]);
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    if (a === 192 && b === 0) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    if (a >= 224) return false;
    return true;
  }
  const lower = ip.toLowerCase();
  return !(
    lower === "::" ||
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  );
}
