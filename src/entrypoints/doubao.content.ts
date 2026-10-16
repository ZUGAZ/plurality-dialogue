import { defineContentScript } from "#imports"
import { runProviderContent } from "@infrastructure/chrome/run-provider-content"
import {
  doubaoContentLayer,
  queryDoubaoSend,
} from "@infrastructure/providers/doubao/fill-send"
import { composerSelectors } from "@infrastructure/providers/doubao/selectors"

export default defineContentScript({
  matches: ["https://www.doubao.com/*"],
  allFrames: true,
  runAt: "document_idle",
  world: "ISOLATED",
  noScriptStartedPostMessage: true,
  main() {
    runProviderContent("doubao", doubaoContentLayer, {
      composerSelectors,
      querySend: () => queryDoubaoSend(document),
    })
  },
})