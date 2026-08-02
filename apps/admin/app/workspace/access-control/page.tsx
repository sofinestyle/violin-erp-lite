import { WorkbenchHub } from "@/components/master-data/workbench-hub";
import { SECURITY_WORKBENCHES } from "@/lib/master-data";

export default function AccessControlPage() {
  return <WorkbenchHub basePath="/workspace/access-control" definitions={SECURITY_WORKBENCHES} />;
}
