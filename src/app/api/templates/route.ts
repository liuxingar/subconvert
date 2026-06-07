import { getTemplateFromDb, listTemplates } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const template = getTemplateFromDb(id);
    if (!template) return Response.json({ error: "模板不存在" }, { status: 404 });
    return Response.json({ template });
  }
  const type = url.searchParams.get("type") === "plaza" ? "plaza" : url.searchParams.get("type") === "all" ? "all" : "default";
  const q = url.searchParams.get("q") || "";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
  const all = listTemplates(type, q);
  const start = (page - 1) * limit;
  return Response.json({
    templates: all.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total: all.length,
      totalPages: Math.max(1, Math.ceil(all.length / limit))
    }
  });
}
