export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSubscriptionScheduler } = await import("@/lib/subscriptionScheduler");
    startSubscriptionScheduler();
  }
}
