import { ConfigBuilder } from "@/components/ConfigBuilder";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const params = await searchParams;
  return <ConfigBuilder initialTemplateId={params.template} />;
}
