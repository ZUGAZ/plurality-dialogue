import { defineConfig } from "wxt"
import {
  hostPermissionPatterns,
  optionalHostPermissionPatterns,
} from "./src/domain/workspace/framing-policy.ts"
import { openWorkspaceCommandName } from "./src/domain/workspace/workspace-page.ts"

const optionalOrigins = new Set<string>(optionalHostPermissionPatterns)

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string")

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
  hooks: {
    "build:manifestGenerated": (_wxt, manifest) => {
      if (!isStringArray(manifest.host_permissions)) {
        return
      }
      manifest.host_permissions = manifest.host_permissions.filter(
        (pattern) => !optionalOrigins.has(pattern),
      )
    },
  },
  manifest: {
    name: "Plurality Dialogue",
    version: "0.2.0",
    description:
      "Compare ChatGPT, Claude, Gemini, Grok, DeepSeek, Kimi, Doubao, and Google in one workspace using the chats you already have; Qwen China, Qwen Global, Zhipu, and Z.ai turn on after a host permission.",
    permissions: [
      "storage",
      "declarativeNetRequestWithHostAccess",
      "contextMenus",
      "scripting",
    ],
    // Host access is for embedding those chats in the workspace tab; session rules are applied at runtime and scoped to the workspace tab; there is no static ruleset.
    host_permissions: [...hostPermissionPatterns],
    optional_host_permissions: [...optionalHostPermissionPatterns],
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
