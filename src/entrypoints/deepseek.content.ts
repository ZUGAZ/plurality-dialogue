import { defineContentScript } from "#imports"
import { runProviderContent } from "@infrastructure/chrome/run-provider-content"
import {
  deepseekContentLayer,
  queryDeepseekSend,
} from "@infrastructure/providers/deepseek/fill-send"
import { composerSelectors } from "@infrastructure/providers/deepseek/selectors"

export default defineContentScript({
  matches: ["https://chat.deepseek.com/*"],
  allFrames: true,
  runAt: "document_idle",
  world: "ISOLATED",
  noScriptStartedPostMessage: true,
  main() {
    runProviderContent("deepseek", deepseekContentLayer, {
      composerSelectors,
      querySend: () => queryDeepseekSend(document),
    })
  },
})
