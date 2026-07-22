import { AppShell } from "@/components/shell/app-shell";
import { HealthGate } from "@/components/shell/health-gate";
import { AppProviders } from "@/contexts/app-providers";

export default function Home() {
  return (
    <AppProviders>
      <HealthGate>
        <AppShell activeSection="home" />
      </HealthGate>
    </AppProviders>
  );
}
