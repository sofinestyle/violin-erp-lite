import { Text, View } from "@tarojs/components";
import type { ReactNode } from "react";
import { EmptyState } from "./empty-state";

export function ShellPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <View className="shell-page">
      <View className="shell-page__header">
        <View>
          <Text className="shell-page__eyebrow">Violin ERP Lite</Text>
          <Text className="shell-page__title">{title}</Text>
        </View>
        <View className="shell-page__avatar">V</View>
      </View>
      <View className="shell-page__card">
        {children ?? <EmptyState title={`${title}暂未开放`} description={description} />}
      </View>
    </View>
  );
}
