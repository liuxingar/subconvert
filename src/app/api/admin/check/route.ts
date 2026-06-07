import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  return Response.json({ isAdmin: cookieStore.get("subboost_admin")?.value === "1" });
}
