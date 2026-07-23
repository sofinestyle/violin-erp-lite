"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { WorkflowView } from "@/lib/workflow";
import { WorkflowWorkbench } from "./workflow-workbench";

export function WorkflowHub({ views }: Readonly<{ views: readonly WorkflowView[] }>) {
  const [active, setActive] = useState(views[0]!.id);
  const view = views.find((item) => item.id === active) ?? views[0]!;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="业务视图">
        {views.map((item) => (
          <Button
            aria-selected={item.id === view.id}
            key={item.id}
            onClick={() => setActive(item.id)}
            role="tab"
            variant={item.id === view.id ? "primary" : "secondary"}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{view.description}</p>
      <WorkflowWorkbench view={view} />
    </div>
  );
}
