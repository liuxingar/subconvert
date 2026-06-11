import { parseSources } from "@/lib/parser";
import { checkRateLimit, requestIp } from "@/lib/rateLimit";
import { assertSameOrigin, sameOriginErrorResponse } from "@/lib/requestGuard";
import { safeFetchText } from "@/lib/safeFetch";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return sameOriginErrorResponse();
  }
  if (!checkRateLimit(`fetch-subscription:${requestIp(request)}`, 30, 60_000)) {
    return Response.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as { url?: string } | null;
  if (!body?.url) return Response.json({ error: "缺少 url" }, { status: 400 });
  try {
    const text = await safeFetchText(body.url);
    const result = parseSources([{ id: "remote", type: "subscription_url", value: body.url, resolvedValue: text }]);
    return Response.json({ content: text, nodes: result.nodes, errors: result.errors });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "订阅解析失败" }, { status: 400 });
  }
}
