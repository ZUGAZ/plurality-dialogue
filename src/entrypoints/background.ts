import { defineBackground } from "#imports"
import { replyForUnknownMessage } from "@domain/messaging/incoming-message"
import { subscribeRuntimeMessages } from "@infrastructure/chrome/runtime-messaging"

export default defineBackground(() => {
  subscribeRuntimeMessages(replyForUnknownMessage)
})
