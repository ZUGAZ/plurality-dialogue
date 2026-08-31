import { defineConfig } from "wxt"
import { hostPermissionPatterns } from "./src/domain/workspace/framing-policy.ts"

export default defineConfig({
  srcDir: "src",
  imports: false,
  modules: ["@wxt-dev/module-solid"],
  alias: {
    "@domain": "src/domain",
    "@infrastructure": "src/infrastructure",
    "@ui": "src/ui",
  },
  manifest: {
    name: "Plurality Dialogue",
    version: "0.1.0",
    description:
      "Compare ChatGPT, Claude, and Gemini in one workspace using the chats you already have.",
    permissions: ["storage", "declarativeNetRequestWithHostAccess"],
    // Host access is for embedding those chats in the workspace tab; session rules are applied at runtime and scoped to the workspace tab; there is no static ruleset.
    host_permissions: [...hostPermissionPatterns],
  },
})
