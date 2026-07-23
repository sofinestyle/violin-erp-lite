import { View } from "@tarojs/components";
import { ShellPage } from "../../components/shell-page";

export default function BusinessPage() {
  return (
    <ShellPage title="业务" description="移动端仅提供正式规划内的采购、生产与验收查询入口。">
      <View className="shell-card">采购查询（只读）</View>
      <View className="shell-card">生产查询（只读）</View>
      <View className="shell-card">验收查询（只读）</View>
    </ShellPage>
  );
}
