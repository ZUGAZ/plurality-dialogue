import { defineContentScript } from "#imports"
import { runProviderContent } from "@infrastructure/chrome/run-provider-content"
import {
  claudeContentLayer,
  queryClaudeSend,
} from "@infrastructure/providers/claude/fill-send"
import { composerSelectors } from "@infrastructure/providers/claude/selectors"

export default defineContentScript({
  matches: ["https://claude.ai/*"],
  allFrames: true,
  runAt: "document_idle",
  world: "ISOLATED",
  noScriptStartedPostMessage: true,
  main() {
    runProviderContent("claude", claudeContentLayer, {
      composerSelectors,
      querySend: () => queryClaudeSend(document),
    })
  },
})
