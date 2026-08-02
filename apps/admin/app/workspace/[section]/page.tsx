import { notFound } from "next/navigation";
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

  return workflowViews ? <WorkflowHub views={workflowViews} /> : null;
}
