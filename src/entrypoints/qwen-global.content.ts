import { defineContentScript } from "#imports"
import { runProviderContent } from "@infrastructure/chrome/run-provider-content"
import {
  qwenGlobalContentLayer,
  queryQwenGlobalSend,
} from "@infrastructure/providers/qwen-global/fill-send"
import { composerSelectors } from "@infrastructure/providers/qwen-global/selectors"

export default defineContentScript({
  registration: "runtime",
  matches: ["https://chat.qwen.ai/*"],
  allFrames: true,
  runAt: "document_idle",
  world: "ISOLATED",
  noScriptStartedPostMessage: true,
  main() {
    runProviderContent("qwen-global", qwenGlobalContentLayer, {
      composerSelectors,
      querySend: () => queryQwenGlobalSend(document),
    })
  },
})
