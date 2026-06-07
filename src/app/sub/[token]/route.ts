import { getSubscriptionByToken, updateSubscriptionCache } from "@/lib/db";
import { parseStoredSubscriptionConfig, renderSubscriptionYaml, shouldUseSubscriptionCache } from "@/lib/subscriptionService";
import { startSubscriptionScheduler } from "@/lib/subscriptionScheduler";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  startSubscriptionScheduler();
  const { token } = await params;
  const subscription = getSubscriptionByToken(token);
  if (!subscription) return new Response("Subscription not found", { status: 404 });
  try {
    const config = parseStoredSubscriptionConfig(subscription.configJson);
    if (subscription.cachedYaml && shouldUseSubscriptionCache(config, subscription.cachedAt)) {
      return yamlResponse(subscription.cachedYaml!);
    }
    const yaml = await renderSubscriptionYaml(config);
    if (config.settings?.autoUpdate === true) updateSubscriptionCache(subscription.id, yaml);
    return yamlResponse(yaml);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Render failed", { status: 500 });
  }
}

function yamlResponse(yaml: string) {
  return new Response(yaml, {
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
