import { notFound } from "next/navigation";
import { MasterDataWorkbench } from "@/components/master-data/master-data-workbench";
import { AppShell } from "@/components/shell/app-shell";
import { HealthGate } from "@/components/shell/health-gate";
import { AppProviders } from "@/contexts/app-providers";
import { getWorkbenchDefinition } from "@/lib/master-data";

export default async function SecurityResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;
  const definition = getWorkbenchDefinition("security", resource);
  if (!definition) notFound();

  return (
    <AppProviders>
      <HealthGate>
        <AppShell
          activeSection="access-control"
          title={`${definition.label}管理`}
          description="使用 SEC-006—SEC-025 正式接口，并由后端执行 RBAC 与审计。"
        >
          <MasterDataWorkbench definition={definition} group="security" />
        </AppShell>
      </HealthGate>
    </AppProviders>
  );
}
