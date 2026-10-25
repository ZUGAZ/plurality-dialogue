import { defineConfig } from "vitest/config"
import solidPlugin from "vite-plugin-solid"
import { WxtVitest } from "wxt/testing/vitest-plugin"

export default defineConfig({
  plugins: [solidPlugin({ ssr: false }), WxtVitest()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
})
