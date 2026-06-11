export function assertSameOrigin(request: Request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const source = origin || referer;

  if (!source) return;
  const sourceUrl = new URL(source);
  if (!allowedOrigins(request).has(normalizeOrigin(sourceUrl.origin))) {
    throw new Error("BAD_ORIGIN");
  }
}

export function sameOriginErrorResponse() {
  return Response.json({ error: "请求来源不可信" }, { status: 403 });
}

function allowedOrigins(request: Request) {
  const requestUrl = new URL(request.url);
  const origins = new Set<string>([normalizeOrigin(requestUrl.origin)]);
  const forwardedProto = firstHeaderValue(request.headers.get("x-forwarded-proto")) || requestUrl.protocol.replace(":", "");
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));
  const host = firstHeaderValue(request.headers.get("host"));

  addHostOrigin(origins, host, requestUrl.protocol.replace(":", ""));
  addHostOrigin(origins, host, forwardedProto);
  addHostOrigin(origins, forwardedHost, forwardedProto);

  for (const configured of configuredOrigins()) {
    try {
      origins.add(normalizeOrigin(new URL(configured).origin));
    } catch {
      // Ignore invalid optional deployment config.
    }
  }

  return origins;
}

function addHostOrigin(origins: Set<string>, host: string | null, protocol: string) {
  if (!host) return;
  const cleanProtocol = protocol === "https" ? "https" : "http";
  origins.add(normalizeOrigin(`${cleanProtocol}://${host}`));
}

function normalizeOrigin(origin: string) {
  const url = new URL(origin);
  const defaultPort = (url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443");
  return `${url.protocol}//${url.hostname}${defaultPort || !url.port ? "" : `:${url.port}`}`;
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function configuredOrigins() {
  return [process.env.SUBBOOST_PUBLIC_ORIGIN, process.env.APP_ORIGIN]
    .flatMap((value) => String(value || "").split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}
