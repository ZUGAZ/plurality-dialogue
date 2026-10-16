import { defineContentScript } from "#imports"
import { runProviderContent } from "@infrastructure/chrome/run-provider-content"
import {
  queryZaiSend,
  zaiContentLayer,
} from "@infrastructure/providers/zai/fill-send"
import { composerSelectors } from "@infrastructure/providers/zai/selectors"

export default defineContentScript({
  registration: "runtime",
  matches: ["https://chat.z.ai/*"],
  allFrames: true,
  runAt: "document_idle",
  world: "ISOLATED",
  noScriptStartedPostMessage: true,
  main() {
    runProviderContent("zai", zaiContentLayer, {
      composerSelectors,
      querySend: () => queryZaiSend(document),
    })
  },
})
