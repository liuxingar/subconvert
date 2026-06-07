import { listArticles } from "@/lib/db";
import { FaqClient } from "@/components/FaqClient";

export const dynamic = "force-dynamic";

export default function FaqPage() {
  return <FaqClient initialArticles={listArticles("all")} />;
}
