import { clearCurrentSession } from "@/lib/auth";
import { assertSameOrigin, sameOriginErrorResponse } from "@/lib/requestGuard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
  } catch {
    return sameOriginErrorResponse();
  }
  await clearCurrentSession();
  return Response.json({ ok: true });
}
