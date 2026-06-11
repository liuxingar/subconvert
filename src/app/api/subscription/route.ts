import { createSubscription, deleteSubscription, getSubscriptionById, listSubscriptions, updateSubscriptionCache, updateSubscriptionRefreshError, updateSubscriptionSettings } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { normalizeImportSources, normalizeSubscriptionYaml, parseStoredSubscriptionConfig, renderSubscriptionYaml, validateSubscriptionYaml, type StoredSubscriptionConfig } from "@/lib/subscriptionService";
import { startSubscriptionScheduler } from "@/lib/subscriptionScheduler";
import { normalizeAdvancedSettings } from "@/lib/advancedConfig";
import { assertSameOrigin, sameOriginErrorResponse } from "@/lib/requestGuard";

export const dynamic = "force-dynamic";

export async function GET() {
  startSubscriptionScheduler();
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser();
  } catch {
    return Response.json({ error: "请先登录" }, { status: 401 });
  }
  return Response.json({
    subscriptions: listSubscriptions(user.id).map((subscription) => {
      const config = parseSubscriptionConfig(subscription.configJson);
      return {
        id: subscription.id,
        name: subscription.name,
        token: subscription.token,
        url: `/sub/${subscription.token}`,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
        cachedAt: subscription.cachedAt,
        lastRefreshAttemptAt: subscription.lastRefreshAttemptAt,
        refreshError: subscription.refreshError,
        refreshErrorAt: subscription.refreshErrorAt,
        sourceCount: config.sources.length,
        templateId: config.templateId,
        settings: {
          smartMatchNodes: config.settings?.smartMatchNodes !== false,
          autoUpdate: config.settings?.autoUpdate === true,
          updateIntervalHours: Math.max(1, Number(config.settings?.updateIntervalHours) || 24)
        },
        config: {
          mode: config.mode || "quick",
          templateId: config.templateId,
          sources: config.sources,
          yaml: config.yaml,
          advancedYaml: config.advancedYaml,
          advancedSettings: config.advancedSettings,
          settings: {
            smartMatchNodes: config.settings?.smartMatchNodes !== false,
            autoUpdate: config.settings?.autoUpdate === true,
            updateIntervalHours: Math.max(1, Number(config.settings?.updateIntervalHours) || 24)
          }
        }
      };
    })
  });
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return sameOriginErrorResponse();
  }
  startSubscriptionScheduler();
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser();
  } catch {
    return Response.json({ error: "生成订阅链接需要登录" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    name?: string;
    templateId?: string;
    sources?: unknown;
    yaml?: string;
    mode?: "quick" | "advanced";
    advancedYaml?: string;
    advancedSettings?: Record<string, unknown>;
    settings?: {
      smartMatchNodes?: boolean;
      autoUpdate?: boolean;
      updateIntervalHours?: number;
    };
  } | null;
  const sources = normalizeImportSources(body?.sources);
  const yaml = normalizeSubscriptionYaml(body?.yaml);
  if (!body?.templateId || !Array.isArray(body.sources)) {
    return Response.json({ error: "缺少订阅配置" }, { status: 400 });
  }
  if (sources.length === 0 && !yaml) {
    return Response.json({ error: "订阅至少需要一个有效导入源或已生成 YAML" }, { status: 400 });
  }
  const yamlError = validateSubscriptionYaml(yaml);
  if (yamlError) return Response.json({ error: yamlError }, { status: 400 });
  const id = crypto.randomUUID();
  const token = crypto.randomUUID().replaceAll("-", "");
  const subscription = createSubscription({
    id,
    userId: user.id,
    token,
    name: body.name?.trim() || "未命名订阅",
    configJson: JSON.stringify({
      templateId: body.templateId,
      sources,
      yaml,
      mode: body.mode === "advanced" ? "advanced" : "quick",
      advancedYaml: normalizeSubscriptionYaml(body.advancedYaml),
      advancedSettings: normalizeAdvancedSettings(body.advancedSettings),
      settings: {
        smartMatchNodes: body.settings?.smartMatchNodes !== false,
        autoUpdate: body.settings?.autoUpdate === true,
        updateIntervalHours: Math.max(1, Number(body.settings?.updateIntervalHours) || 24)
      }
    })
  });
  if (yaml) updateSubscriptionCache(subscription.id, yaml);
  return Response.json({
    subscription: {
      id: subscription.id,
      name: subscription.name,
      token: subscription.token,
      url: `/sub/${subscription.token}`
    }
  });
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return sameOriginErrorResponse();
  }
  startSubscriptionScheduler();
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser();
  } catch {
    return Response.json({ error: "请先登录" }, { status: 401 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "缺少 id" }, { status: 400 });
  const subscription = getSubscriptionById(id, user.id);
  if (!subscription) return Response.json({ error: "订阅不存在" }, { status: 404 });
  deleteSubscription(id, user.id);
  return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return sameOriginErrorResponse();
  }
  startSubscriptionScheduler();
  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser();
  } catch {
    return Response.json({ error: "请先登录" }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    id?: string;
    action?: string;
    name?: string;
    settings?: {
      smartMatchNodes?: boolean;
      autoUpdate?: boolean;
      updateIntervalHours?: number;
    };
    templateId?: string;
    sources?: unknown;
    yaml?: string;
    mode?: "quick" | "advanced";
    advancedYaml?: string;
    advancedSettings?: Record<string, unknown>;
  } | null;
  if (!body?.id) return Response.json({ error: "缺少 id" }, { status: 400 });
  const subscription = getSubscriptionById(body.id, user.id);
  if (!subscription) return Response.json({ error: "订阅不存在" }, { status: 404 });
  if (body.action === "update") {
    const config = parseSubscriptionConfig(subscription.configJson);
    const name = body.name?.trim() || subscription.name;
    const settings = {
      smartMatchNodes: body.settings?.smartMatchNodes !== false,
      autoUpdate: body.settings?.autoUpdate === true,
      updateIntervalHours: Math.max(1, Number(body.settings?.updateIntervalHours) || 24)
    };
    const updated = updateSubscriptionSettings(subscription.id, {
      name,
      configJson: JSON.stringify({ ...config, settings })
    });
    return Response.json({ ok: true, subscription: updated });
  }
  if (body.action === "updateConfig") {
    const sources = normalizeImportSources(body.sources);
    const yaml = normalizeSubscriptionYaml(body.yaml);
    if (!body.templateId || !Array.isArray(body.sources)) {
      return Response.json({ error: "缺少订阅配置" }, { status: 400 });
    }
    if (sources.length === 0 && !yaml) {
      return Response.json({ error: "订阅至少需要一个有效导入源或已生成 YAML" }, { status: 400 });
    }
    const yamlError = validateSubscriptionYaml(yaml);
    if (yamlError) return Response.json({ error: yamlError }, { status: 400 });
    const currentConfig = parseSubscriptionConfig(subscription.configJson);
    const settings = {
      smartMatchNodes: body.settings?.smartMatchNodes !== false,
      autoUpdate: body.settings?.autoUpdate === true,
      updateIntervalHours: Math.max(1, Number(body.settings?.updateIntervalHours) || 24)
    };
    const name = body.name?.trim() || subscription.name;
    const updated = updateSubscriptionSettings(subscription.id, {
      name,
      configJson: JSON.stringify({
        ...currentConfig,
        templateId: body.templateId,
        sources,
        yaml,
        mode: body.mode === "advanced" ? "advanced" : "quick",
        advancedYaml: normalizeSubscriptionYaml(body.advancedYaml),
        advancedSettings: normalizeAdvancedSettings(body.advancedSettings),
        settings
      })
    });
    if (updated?.id && yaml) updateSubscriptionCache(updated.id, yaml);
    return Response.json({
      ok: true,
      subscription: {
        id: updated?.id,
        name: updated?.name,
        token: updated?.token,
        url: updated ? `/sub/${updated.token}` : `/sub/${subscription.token}`
      }
    });
  }
  if (body.action !== "refresh") return Response.json({ error: "未知操作" }, { status: 400 });

  try {
    const yaml = await renderSubscriptionYaml(parseSubscriptionConfig(subscription.configJson));
    updateSubscriptionCache(subscription.id, yaml);
    return Response.json({ ok: true, refreshedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refresh failed";
    updateSubscriptionRefreshError(subscription.id, message);
    return Response.json({ error: message }, { status: 500 });
  }
}

function parseSubscriptionConfig(configJson: string): StoredSubscriptionConfig {
  return parseStoredSubscriptionConfig(configJson);
}
