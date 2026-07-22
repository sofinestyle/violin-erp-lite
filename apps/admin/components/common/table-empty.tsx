import { EmptyState } from "./empty-state";

export function TableEmpty() {
  return <EmptyState title="暂无数据" description="当前表格没有可展示的内容。" compact />;
}
