import { Effect } from "effect"
import { defineBackground } from "#imports"
import { removeFramingSessionRules } from "@infrastructure/chrome/declarative-net-request"
import { handleBackgroundMessage } from "@infrastructure/chrome/handle-background-message"
import { subscribeRuntimeMessages } from "@infrastructure/chrome/runtime-messaging"
import { subscribeTabRemoved } from "@infrastructure/chrome/tabs"

export default defineBackground(() => {
  subscribeRuntimeMessages(handleBackgroundMessage)
  subscribeTabRemoved((tabId) => {
    void Effect.runPromise(
      removeFramingSessionRules(tabId).pipe(Effect.ignore),
    )
  })
})
