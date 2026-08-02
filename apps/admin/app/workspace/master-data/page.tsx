import { WorkbenchHub } from "@/components/master-data/workbench-hub";
import { MASTER_WORKBENCHES } from "@/lib/master-data";

export default function MasterDataPage() {
  return <WorkbenchHub basePath="/workspace/master-data" definitions={MASTER_WORKBENCHES} />;
}
