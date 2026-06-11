export function assertSameOrigin(request: Request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const source = origin || referer;

  if (!source) return;
  const sourceUrl = new URL(source);
  if (sourceUrl.origin !== requestUrl.origin) {
    throw new Error("BAD_ORIGIN");
  }
}

export function sameOriginErrorResponse() {
  return Response.json({ error: "请求来源不可信" }, { status: 403 });
}
