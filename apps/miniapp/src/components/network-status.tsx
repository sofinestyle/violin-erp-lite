import Taro from "@tarojs/taro";
import { Text, View } from "@tarojs/components";
import { useEffect, useState } from "react";

export function NetworkStatusBanner() {
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    void Taro.getNetworkType().then(({ networkType }) => setConnected(networkType !== "none"));
    const listener = ({ isConnected }: { isConnected: boolean }) => setConnected(isConnected);
    Taro.onNetworkStatusChange(listener);
    return () => Taro.offNetworkStatusChange(listener);
  }, []);

  return connected ? null : (
    <View className="network-banner" role="alert">
      <Text>网络连接已断开，请检查网络设置。</Text>
    </View>
  );
}
