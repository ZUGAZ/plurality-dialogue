import { defineContentScript } from "#imports"
import { runProviderContent } from "@infrastructure/chrome/run-provider-content"
import {
  grokContentLayer,
  queryGrokSend,
} from "@infrastructure/providers/grok/fill-send"
import { composerSelectors } from "@infrastructure/providers/grok/selectors"

export default defineContentScript({
  matches: ["https://grok.com/*"],
  allFrames: true,
  runAt: "document_idle",
  world: "ISOLATED",
  noScriptStartedPostMessage: true,
  main() {
    runProviderContent("grok", grokContentLayer, {
      composerSelectors,
      querySend: () => queryGrokSend(document),
    })
  },
})
