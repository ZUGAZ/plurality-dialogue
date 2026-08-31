import { defineContentScript } from "#imports"
import { runProviderContent } from "@infrastructure/chrome/run-provider-content"
import { chatgptContentLayer } from "@infrastructure/providers/chatgpt/fill-send"

export default defineContentScript({
  matches: ["https://chatgpt.com/*"],
  allFrames: true,
  runAt: "document_idle",
  world: "ISOLATED",
  noScriptStartedPostMessage: true,
  main() {
    runProviderContent("chatgpt", chatgptContentLayer)
  },
})
