import { WorkbenchHub } from "@/components/master-data/workbench-hub";
import { AppShell } from "@/components/shell/app-shell";
import { HealthGate } from "@/components/shell/health-gate";
import { AppProviders } from "@/contexts/app-providers";
import { SECURITY_WORKBENCHES } from "@/lib/master-data";

export default function AccessControlPage() {
  return (
    <AppProviders>
      <HealthGate>
        <AppShell
          activeSection="access-control"
          title="用户权限"
          description="统一维护用户、正式角色、权限分配及仓库和店铺数据范围。"
        >
          <WorkbenchHub basePath="/workspace/access-control" definitions={SECURITY_WORKBENCHES} />
        </AppShell>
      </HealthGate>
    </AppProviders>
  );
}
