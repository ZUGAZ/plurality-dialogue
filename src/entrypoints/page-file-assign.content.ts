import { defineContentScript } from "#imports"
import { installPageFileAssigner } from "@infrastructure/providers/page-file-assign"

export default defineContentScript({
  matches: [
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://grok.com/*",
    "https://chat.deepseek.com/*",
    "https://www.kimi.com/*",
    "https://www.doubao.com/*",
    "https://www.google.com/*",
  ],
  allFrames: true,
  runAt: "document_start",
  world: "MAIN",
  main() {
    installPageFileAssigner()
  },
})
