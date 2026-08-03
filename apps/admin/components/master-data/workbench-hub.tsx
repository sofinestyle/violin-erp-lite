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
  const product = definitions.find((definition) => definition.key === "products");
  const sku = definitions.find((definition) => definition.key === "skus");
  const platform = definitions.find((definition) => definition.key === "ecommerce-platforms");
  const store = definitions.find((definition) => definition.key === "stores");
  const groupedKeys = new Set(["products", "skus", "ecommerce-platforms", "stores"]);
  const standaloneDefinitions = definitions.filter(
    (definition) => !groupedKeys.has(definition.key),
  );

  return (
    <div className="space-y-4">
      {product && sku ? (
        <Card className="border-primary/20 bg-primary-soft p-5">
          <h2 className="text-base font-semibold text-[#1D4ED8]">产品 / SKU 规格</h2>
          <p className="mt-2 text-sm leading-6 text-[#1E3A8A]">
            页面按用户视角合并入口，底层仍保持 Product 与 SKU 两类数据对象分离。先维护产品，再补充
            SKU 尺寸、颜色、规格、单位与安全库存。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <WorkbenchLink basePath={basePath} definition={product} />
            <WorkbenchLink basePath={basePath} definition={sku} />
          </div>
        </Card>
      ) : null}

      {platform && store ? (
        <Card className="border-primary/20 bg-primary-soft p-5">
          <h2 className="text-base font-semibold text-[#1D4ED8]">平台 / 店铺</h2>
          <p className="mt-2 text-sm leading-6 text-[#1E3A8A]">
            页面统一呈现平台到店铺的运营关系；底层仍复用 ecommerce_platforms 与
            stores，避免建立平行数据源。
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <WorkbenchLink basePath={basePath} definition={platform} />
            <WorkbenchLink basePath={basePath} definition={store} />
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-3 gap-4">
        {standaloneDefinitions.map((definition) => (
          <Card key={definition.key} className="p-5">
            <h2 className="text-base font-semibold">{definition.label}管理</h2>
            <p className="mt-2 min-h-10 text-sm leading-5 text-muted-foreground">
              查询、详情、维护、启停及授权范围内的分页检索。
            </p>
            <WorkbenchLink basePath={basePath} definition={definition} />
          </Card>
        ))}
      </div>
    </div>
  );
}

function WorkbenchLink({
  basePath,
  definition,
}: {
  basePath: string;
  definition: WorkbenchDefinition;
}) {
  return (
    <Link
      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      href={`${basePath}/${definition.key}`}
    >
      进入{definition.label}管理
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}
