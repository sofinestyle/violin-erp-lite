import { Card, Skeleton } from "@/components/common";

export default function Loading() {
  return (
    <div className="space-y-5" aria-label="正在加载页面内容" aria-live="polite">
      <Card className="p-5">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-3 h-4 w-96" />
      </Card>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} className="p-5">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
          </Card>
        ))}
      </div>
    </div>
  );
}
