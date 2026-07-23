import { WorkbenchHub } from "@/components/master-data/workbench-hub";
import { AppShell } from "@/components/shell/app-shell";
import { HealthGate } from "@/components/shell/health-gate";
import { AppProviders } from "@/contexts/app-providers";
import { MASTER_WORKBENCHES } from "@/lib/master-data";

export default function MasterDataPage() {
  return (
    <AppProviders>
      <HealthGate>
        <AppShell
          activeSection="master-data"
          title="基础资料"
          description="维护 ERP 唯一正式基础数据来源；停用保留历史引用。"
        >
          <WorkbenchHub basePath="/workspace/master-data" definitions={MASTER_WORKBENCHES} />
        </AppShell>
      </HealthGate>
    </AppProviders>
  );
}
