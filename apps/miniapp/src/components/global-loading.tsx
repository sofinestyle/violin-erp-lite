import { Text, View } from "@tarojs/components";

export function GlobalLoading() {
  return (
    <View className="global-state" aria-label="正在加载">
      <View className="global-state__spinner" />
      <Text className="global-state__text">正在加载应用</Text>
    </View>
  );
}
