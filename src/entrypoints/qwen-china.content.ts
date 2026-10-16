import { defineContentScript } from "#imports"
import { runProviderContent } from "@infrastructure/chrome/run-provider-content"
import {
  qwenChinaContentLayer,
  queryQwenChinaSend,
} from "@infrastructure/providers/qwen-china/fill-send"
import { composerSelectors } from "@infrastructure/providers/qwen-china/selectors"

export default defineContentScript({
  registration: "runtime",
  matches: ["https://www.qianwen.com/*"],
  allFrames: true,
  runAt: "document_idle",
  world: "ISOLATED",
  noScriptStartedPostMessage: true,
  main() {
    runProviderContent("qwen-china", qwenChinaContentLayer, {
      composerSelectors,
      querySend: () => queryQwenChinaSend(document),
    })
  },
})
