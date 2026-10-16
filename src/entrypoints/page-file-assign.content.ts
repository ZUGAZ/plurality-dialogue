import { defineContentScript } from "#imports"
import { installPageFileAssigner } from "@infrastructure/providers/page-file-assign"

export default defineContentScript({
  matches: [
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
  ],
  allFrames: true,
  runAt: "document_start",
  world: "MAIN",
  main() {
    installPageFileAssigner()
  },
})
