export default defineAppConfig({
  pages: [
    "pages/index/index",
    "pages/business/index",
    "pages/inventory/index",
    "pages/sku-query/index",
    "pages/profile/index",
  ],
  window: {
    navigationBarTitleText: "Violin ERP Lite",
    navigationBarBackgroundColor: "#FFFFFF",
    navigationBarTextStyle: "black",
    backgroundColor: "#F5F7FA",
  },
  tabBar: {
    color: "#6B7280",
    selectedColor: "#2563EB",
    backgroundColor: "#FFFFFF",
    borderStyle: "black",
    list: [
      { pagePath: "pages/index/index", text: "首页" },
      { pagePath: "pages/business/index", text: "业务" },
      { pagePath: "pages/inventory/index", text: "库存" },
      { pagePath: "pages/profile/index", text: "我的" },
    ],
  },
});
