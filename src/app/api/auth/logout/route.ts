import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("subboost_user");
  cookieStore.delete("subboost_admin");
  cookieStore.delete("subboost_admin_user");
  return Response.json({ ok: true });
}
