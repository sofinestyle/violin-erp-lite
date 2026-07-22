import { Text, View } from "@tarojs/components";
import type { ReactNode } from "react";

export function EmptyState({
  title = "暂无内容",
  description = "当前区域为工程占位，业务功能尚未开始。",
  children,
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <View className="empty-state">
      <View className="empty-state__icon">V</View>
      <Text className="empty-state__title">{title}</Text>
      <Text className="empty-state__description">{description}</Text>
      {children}
    </View>
  );
}
