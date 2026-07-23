import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/common";
import type { WorkbenchDefinition } from "@/lib/master-data";

export function WorkbenchHub({
  basePath,
  definitions,
}: {
  basePath: string;
  definitions: readonly WorkbenchDefinition[];
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {definitions.map((definition) => (
        <Card key={definition.key} className="p-5">
          <h2 className="text-base font-semibold">{definition.label}管理</h2>
          <p className="mt-2 min-h-10 text-sm leading-5 text-muted-foreground">
            查询、详情、维护、启停及授权范围内的分页检索。
          </p>
          <Link
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            href={`${basePath}/${definition.key}`}
          >
            进入{definition.label}管理
            <ArrowRight aria-hidden="true" />
          </Link>
        </Card>
      ))}
    </div>
  );
}
