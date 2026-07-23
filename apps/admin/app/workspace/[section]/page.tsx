import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { HealthGate } from "@/components/shell/health-gate";
import { AppProviders } from "@/contexts/app-providers";
import { isNavigationSection } from "@/lib/navigation";
import { WorkflowHub } from "@/components/workflow/workflow-hub";
import {
  crossBorderViews,
  inventoryViews,
  procurementViews,
  productionViews,
  warehouseOperationViews,
} from "@/lib/workflow";

type WorkspacePlaceholderPageProps = {
  params: Promise<{ section: string }>;
};

export default async function WorkspacePlaceholderPage({ params }: WorkspacePlaceholderPageProps) {
  const { section } = await params;

  if (!isNavigationSection(section) || section === "home") {
    notFound();
  }

  const workflowViews =
    section === "purchase"
      ? procurementViews
      : section === "production"
        ? productionViews
        : section === "inventory"
          ? inventoryViews
          : section === "warehouse-operations"
            ? warehouseOperationViews
            : section === "cross-border"
              ? crossBorderViews
              : null;

  return (
    <AppProviders>
      <HealthGate>
        <AppShell
          activeSection={section}
          {...(workflowViews ? { description: "严格依据正式 API 与权限的数据工作台。" } : {})}
        >
          {workflowViews ? <WorkflowHub views={workflowViews} /> : undefined}
        </AppShell>
      </HealthGate>
    </AppProviders>
  );
}
