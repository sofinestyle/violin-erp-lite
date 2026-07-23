import Taro from "@tarojs/taro";
import { Button, Input, Text, View } from "@tarojs/components";
import { useState } from "react";
import { EmptyState } from "../../components/empty-state";
import { GlobalLoading } from "../../components/global-loading";

type SkuItem = Readonly<{
  id: string;
  isActive: boolean;
  skuCode: string;
  skuName: string;
  specification?: string | null;
  unit: string;
}>;

type ApiEnvelope = Readonly<{
  data?: readonly SkuItem[];
  error?: { message?: string };
  requestId?: string;
  success?: boolean;
}>;

function apiUrl(path: string): string {
  const baseUrl = process.env.TARO_APP_API_BASE_URL?.trim().replace(/\/$/, "");
  if (!baseUrl) throw new Error("小程序 API 地址未配置");
  return `${baseUrl}${path}`;
}

export default function SkuQueryPage() {
  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState<readonly SkuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function search() {
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const token = Taro.getStorageSync<string>("violin.accessToken");
      const response = await Taro.request<ApiEnvelope>({
        url: apiUrl(
          `/api/v1/skus?page=1&pageSize=20&isActive=true&keyword=${encodeURIComponent(keyword.trim())}`,
        ),
        header: token ? { Authorization: `Bearer ${token}` } : {},
        method: "GET",
      });
      if (response.statusCode >= 400 || response.data.success !== true) {
        const suffix = response.data.requestId ? `（${response.data.requestId}）` : "";
        throw new Error(`${response.data.error?.message ?? "查询失败"}${suffix}`);
      }
      setItems(response.data.data ?? []);
    } catch (requestError) {
      setItems([]);
      setError(requestError instanceof Error ? requestError.message : "查询失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="shell-page">
      <View className="shell-page__header">
        <View>
          <Text className="shell-page__eyebrow">基础资料</Text>
          <Text className="shell-page__title">SKU 查询</Text>
        </View>
      </View>
      <View className="mini-search">
        <Input
          className="mini-search__input"
          value={keyword}
          onInput={(event) => setKeyword(event.detail.value)}
          placeholder="输入 SKU 编码、名称或规格"
        />
        <Button className="mini-entry__button" onClick={() => void search()}>
          查询
        </Button>
      </View>
      {loading ? <GlobalLoading /> : null}
      {error ? <Text className="mini-search__error">{error}</Text> : null}
      {!loading && searched && !error && items.length === 0 ? (
        <EmptyState title="暂无 SKU" description="没有找到符合当前条件的启用 SKU。" />
      ) : null}
      {!loading
        ? items.map((item) => (
            <View className="mini-search__result" key={item.id}>
              <Text className="mini-search__code">{item.skuCode}</Text>
              <Text className="mini-search__name">{item.skuName}</Text>
              <Text className="mini-search__meta">
                {item.specification || "无规格"} · {item.unit}
              </Text>
            </View>
          ))
        : null}
    </View>
  );
}
