import { notFound } from "next/navigation";
import { MasterDataWorkbench } from "@/components/master-data/master-data-workbench";
import { AppShell } from "@/components/shell/app-shell";
import { HealthGate } from "@/components/shell/health-gate";
import { AppProviders } from "@/contexts/app-providers";
import { getWorkbenchDefinition } from "@/lib/master-data";

export default async function MasterDataResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;
  const definition = getWorkbenchDefinition("master", resource);
  if (!definition) notFound();

  return (
    <AppProviders>
      <HealthGate>
        <AppShell
          activeSection="master-data"
          title={`${definition.label}管理`}
          description="列表、详情、新增、更新、启停、搜索、筛选和分页均调用 Frozen 正式 API。"
        >
          <MasterDataWorkbench definition={definition} group="master" />
        </AppShell>
      </HealthGate>
    </AppProviders>
  );
}
