import { defineContentScript } from "#imports"
import { runProviderContent } from "@infrastructure/chrome/run-provider-content"
import {
  geminiContentLayer,
  queryGeminiSend,
} from "@infrastructure/providers/gemini/fill-send"
import { composerSelectors } from "@infrastructure/providers/gemini/selectors"

export default defineContentScript({
  matches: ["https://gemini.google.com/*"],
  allFrames: true,
  runAt: "document_idle",
  world: "ISOLATED",
  noScriptStartedPostMessage: true,
  main() {
    runProviderContent("gemini", geminiContentLayer, {
      composerSelectors,
      querySend: () => queryGeminiSend(document),
    })
  },
})
