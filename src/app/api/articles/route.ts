import { listArticles } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") || "all";
  return Response.json({ articles: listArticles(category) });
}
