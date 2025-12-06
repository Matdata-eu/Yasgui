import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: "dev",
  publicDir: false,
  server: {
    host: "0.0.0.0",
    port: 4000,
    open: "/index.html",
  },
  resolve: {
    alias: {
      "@matdata/yasgui": resolve(__dirname, "packages/yasgui/src/index.ts"),
      "@matdata/yasqe": resolve(__dirname, "packages/yasqe/src/index.ts"),
      "@matdata/yasr": resolve(__dirname, "packages/yasr/src/index.ts"),
      "@matdata/yasgui-utils": resolve(__dirname, "packages/utils/src/index.ts"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  optimizeDeps: {
    include: ["vis-network", "@matdata/yasgui-graph-plugin", "yasgui-geo-tg"],
  },
  esbuild: {
    target: "es2020",
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler", // or "modern"
      },
    },
  },
});
