import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { HealthGate } from "@/components/shell/health-gate";
import { AppProviders } from "@/contexts/app-providers";
import { isNavigationSection } from "@/lib/navigation";
import { WorkflowHub } from "@/components/workflow/workflow-hub";
import { inboundViews, procurementViews, productionViews } from "@/lib/workflow";

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
        : section === "warehouse-operations"
          ? inboundViews
          : null;

  return (
    <AppProviders>
      <HealthGate>
        <AppShell
          activeSection={section}
          {...(workflowViews
            ? { description: "采购与生产分别保持独立来源，验收确认后进入对应正式入库。" }
            : {})}
        >
          {workflowViews ? <WorkflowHub views={workflowViews} /> : undefined}
        </AppShell>
      </HealthGate>
    </AppProviders>
  );
}
