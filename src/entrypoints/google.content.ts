import { defineContentScript } from "#imports"
import { runProviderContent } from "@infrastructure/chrome/run-provider-content"
import {
  googleContentLayer,
  queryGoogleSend,
} from "@infrastructure/providers/google/fill-send"
import { composerSelectors } from "@infrastructure/providers/google/selectors"

export default defineContentScript({
  matches: ["https://www.google.com/*"],
  allFrames: true,
  runAt: "document_idle",
  world: "ISOLATED",
  noScriptStartedPostMessage: true,
  main() {
    runProviderContent("google", googleContentLayer, {
      composerSelectors,
      querySend: () => queryGoogleSend(document),
    })
  },
})
