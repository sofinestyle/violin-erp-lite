import { notFound } from "next/navigation";
import { MasterDataWorkbench } from "@/components/master-data/master-data-workbench";
import { getWorkbenchDefinition } from "@/lib/master-data";

export default async function SecurityResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;
  const definition = getWorkbenchDefinition("security", resource);
  if (!definition) notFound();

  return <MasterDataWorkbench definition={definition} group="security" />;
}
