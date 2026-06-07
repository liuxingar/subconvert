import { listSubscriptions, updateSubscriptionCache, updateSubscriptionRefreshError } from "@/lib/db";
import { isSubscriptionRefreshDue, parseStoredSubscriptionConfig, renderSubscriptionYaml } from "@/lib/subscriptionService";

type SchedulerState = {
  started: boolean;
  running: boolean;
  timer: ReturnType<typeof setInterval> | null;
};

type RefreshSummary = {
  checked: number;
  due: number;
  refreshed: number;
  failed: number;
  skipped: boolean;
};

const globalKey = "__subboostSubscriptionScheduler";

declare global {
  var __subboostSubscriptionScheduler: SchedulerState | undefined;
}

export function startSubscriptionScheduler() {
  if (process.env.SUBBOOST_SCHEDULER_ENABLED === "false") return;
  const state = getSchedulerState();
  if (state.started) return;

  state.started = true;
  const scanMs = getPositiveNumber(process.env.SUBBOOST_REFRESH_SCAN_SECONDS, 300) * 1000;
  const startupDelayMs = getPositiveNumber(process.env.SUBBOOST_REFRESH_STARTUP_DELAY_SECONDS, 5) * 1000;

  if (process.env.SUBBOOST_REFRESH_ON_STARTUP !== "false") {
    setTimeout(() => {
      void runScheduledSubscriptionRefresh();
    }, startupDelayMs).unref?.();
  }

  state.timer = setInterval(() => {
    void runScheduledSubscriptionRefresh();
  }, scanMs);
  state.timer.unref?.();
}

export async function runScheduledSubscriptionRefresh(): Promise<RefreshSummary> {
  const state = getSchedulerState();
  if (state.running) return { checked: 0, due: 0, refreshed: 0, failed: 0, skipped: true };

  state.running = true;
  const summary: RefreshSummary = { checked: 0, due: 0, refreshed: 0, failed: 0, skipped: false };
  const now = Date.now();

  try {
    const subscriptions = listSubscriptions();
    summary.checked = subscriptions.length;

    for (const subscription of subscriptions) {
      const config = parseStoredSubscriptionConfig(subscription.configJson);
      if (!isSubscriptionRefreshDue(config, subscription, now)) continue;
      summary.due += 1;

      try {
        const yaml = await renderSubscriptionYaml(config);
        updateSubscriptionCache(subscription.id, yaml);
        summary.refreshed += 1;
      } catch (error) {
        updateSubscriptionRefreshError(subscription.id, error instanceof Error ? error.message : "Refresh failed");
        summary.failed += 1;
      }
    }
  } finally {
    state.running = false;
  }

  return summary;
}

function getSchedulerState() {
  const store = globalThis as typeof globalThis & Record<typeof globalKey, SchedulerState | undefined>;
  store[globalKey] ||= { started: false, running: false, timer: null };
  return store[globalKey];
}

function getPositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
