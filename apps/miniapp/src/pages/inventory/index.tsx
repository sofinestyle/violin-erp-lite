import Taro from "@tarojs/taro";
import { Button, Text, View } from "@tarojs/components";

export default function InventoryPage() {
  return (
    <View className="shell-page">
      <View className="shell-page__header">
        <View>
          <Text className="shell-page__eyebrow">Violin ERP Lite</Text>
          <Text className="shell-page__title">库存</Text>
        </View>
        <View className="shell-page__avatar">V</View>
      </View>
      <View className="shell-page__card mini-entry">
        <Text className="mini-entry__title">SKU 查询</Text>
        <Text className="mini-entry__description">
          查询正式 SKU 基础资料，不提供后台维护和库存操作。
        </Text>
        <Button
          className="mini-entry__button"
          onClick={() => void Taro.navigateTo({ url: "/pages/sku-query/index" })}
        >
          进入查询
        </Button>
      </View>
      <View className="shell-page__card mini-entry">
        <Text className="mini-entry__title">库存余额查询</Text>
        <Text className="mini-entry__description">按授权仓库只读查询库存余额与可用数量。</Text>
      </View>
      <View className="shell-page__card mini-entry">
        <Text className="mini-entry__title">库存流水查询</Text>
        <Text className="mini-entry__description">只读追溯正式库存事务及来源单据。</Text>
      </View>
      <View className="shell-page__card mini-entry">
        <Text className="mini-entry__title">出入库查询</Text>
        <Text className="mini-entry__description">只读查看调拨、国内出库与销售退货记录。</Text>
      </View>
      <View className="shell-page__card mini-entry">
        <Text className="mini-entry__title">跨境查询</Text>
        <Text className="mini-entry__description">只读查看跨境发货和海外仓库存来源。</Text>
      </View>
    </View>
  );
}
