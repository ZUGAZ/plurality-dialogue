import { defineConfig } from "wxt"
import { hostPermissionPatterns } from "./src/domain/workspace/framing-policy.ts"
import { openWorkspaceCommandName } from "./src/domain/workspace/workspace-page.ts"

export default defineConfig({
  srcDir: "src",
  imports: false,
  modules: ["@wxt-dev/module-solid"],
  alias: {
    "@domain": "src/domain",
    "@infrastructure": "src/infrastructure",
    "@ui": "src/ui",
    "@test-support": "src/test-support",
  },
  manifest: {
    name: "Plurality Dialogue",
    version: "0.2.0",
    description:
      "Compare ChatGPT, Claude, and Gemini in one workspace using the chats you already have.",
    permissions: ["storage", "declarativeNetRequestWithHostAccess"],
    // Host access is for embedding those chats in the workspace tab; session rules are applied at runtime and scoped to the workspace tab; there is no static ruleset.
    host_permissions: [...hostPermissionPatterns],
    action: { default_title: "Open Plurality Dialogue" },
    commands: {
      [openWorkspaceCommandName]: {
        suggested_key: {
          default: "Ctrl+Shift+E",
          mac: "Command+Shift+E",
        },
        description: "Open the workspace",
      },
    },
  },
})
