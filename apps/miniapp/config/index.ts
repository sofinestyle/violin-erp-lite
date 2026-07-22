import { defineConfig, type UserConfigExport } from "@tarojs/cli";

const config: UserConfigExport = {
  projectName: "violin-erp-lite-miniapp",
  date: "2026-07-22",
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: "src",
  outputRoot: "dist",
  framework: "react",
  compiler: "webpack5",
  cache: {
    enable: false,
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {},
      },
    },
  },
};

export default defineConfig(config);
