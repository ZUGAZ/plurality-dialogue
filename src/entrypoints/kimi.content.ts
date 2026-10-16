import { defineContentScript } from "#imports"
import { runProviderContent } from "@infrastructure/chrome/run-provider-content"
import {
  kimiContentLayer,
  queryKimiSend,
} from "@infrastructure/providers/kimi/fill-send"
import { composerSelectors } from "@infrastructure/providers/kimi/selectors"

export default defineContentScript({
  matches: ["https://www.kimi.com/*"],
  allFrames: true,
  runAt: "document_idle",
  world: "ISOLATED",
  noScriptStartedPostMessage: true,
  main() {
    runProviderContent("kimi", kimiContentLayer, {
      composerSelectors,
      querySend: () => queryKimiSend(document),
    })
  },
})
