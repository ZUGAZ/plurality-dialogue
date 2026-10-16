import { defineContentScript } from "#imports"
import { runProviderContent } from "@infrastructure/chrome/run-provider-content"
import {
  queryZhipuSend,
  zhipuContentLayer,
} from "@infrastructure/providers/zhipu/fill-send"
import { composerSelectors } from "@infrastructure/providers/zhipu/selectors"

export default defineContentScript({
  registration: "runtime",
  matches: ["https://chatglm.cn/*"],
  allFrames: true,
  runAt: "document_idle",
  world: "ISOLATED",
  noScriptStartedPostMessage: true,
  main() {
    runProviderContent("zhipu", zhipuContentLayer, {
      composerSelectors,
      querySend: () => queryZhipuSend(document),
    })
  },
})
