import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { HealthGate } from "@/components/shell/health-gate";
import { AppProviders } from "@/contexts/app-providers";
import { isNavigationSection } from "@/lib/navigation";

type WorkspacePlaceholderPageProps = {
  params: Promise<{ section: string }>;
};

export default async function WorkspacePlaceholderPage({ params }: WorkspacePlaceholderPageProps) {
  const { section } = await params;

  if (!isNavigationSection(section) || section === "home") {
    notFound();
  }

  return (
    <AppProviders>
      <HealthGate>
        <AppShell activeSection={section} />
      </HealthGate>
    </AppProviders>
  );
}
