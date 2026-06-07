import { getSubscriptionByToken, updateSubscriptionCache } from "@/lib/db";
import { renderSubscriptionYaml, type StoredSubscriptionConfig } from "@/lib/subscriptionService";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const subscription = getSubscriptionByToken(token);
  if (!subscription) return new Response("Subscription not found", { status: 404 });
  try {
    const config = JSON.parse(subscription.configJson) as StoredSubscriptionConfig;
    if (shouldUseCache(config, subscription.cachedYaml, subscription.cachedAt)) {
      return yamlResponse(subscription.cachedYaml!);
    }
    const yaml = await renderSubscriptionYaml(config);
    if (config.settings?.autoUpdate === true) updateSubscriptionCache(subscription.id, yaml);
    return yamlResponse(yaml);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Render failed", { status: 500 });
  }
}

function shouldUseCache(config: StoredSubscriptionConfig, cachedYaml: string | null, cachedAt: string | null) {
  if (config.settings?.autoUpdate !== true || !cachedYaml || !cachedAt) return false;
  const intervalHours = Math.max(1, Number(config.settings.updateIntervalHours) || 24);
  const cachedTime = new Date(cachedAt).getTime();
  if (!Number.isFinite(cachedTime)) return false;
  return Date.now() - cachedTime < intervalHours * 60 * 60 * 1000;
}

function yamlResponse(yaml: string) {
  return new Response(yaml, {
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
