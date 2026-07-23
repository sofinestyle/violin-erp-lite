import { Button, Text, View } from "@tarojs/components";
import { useAppContext } from "../../contexts/app-context";

export default function ProfilePage() {
  const { logout, permissions, user } = useAppContext();
  return (
    <View className="shell-page">
      <View className="shell-page__header">
        <View>
          <Text className="shell-page__eyebrow">当前会话</Text>
          <Text className="shell-page__title">{user.displayName}</Text>
        </View>
      </View>
      <View className="shell-page__card mini-entry">
        <Text className="mini-entry__title">{user.username}</Text>
        <Text className="mini-entry__description">已加载 {permissions.size} 项当前有效权限</Text>
        <Button className="mini-entry__button" onClick={() => void logout()}>
          退出登录
        </Button>
      </View>
    </View>
  );
}
