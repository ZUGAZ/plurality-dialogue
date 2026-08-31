import { Effect, Layer, Option } from "effect"
import { Messaging, MessagingSendFailed } from "../../domain/ports/messaging"

export const sendRuntimeMessage = (
  message: unknown,
): Effect.Effect<unknown, MessagingSendFailed> =>
  Effect.tryPromise({
    try: () => chrome.runtime.sendMessage(message),
    catch: (cause) => new MessagingSendFailed({ cause }),
  })

export const ChromeMessagingLive = Layer.succeed(Messaging, {
  send: sendRuntimeMessage,
})

export const subscribeRuntimeMessages = (
  respond: (
    message: unknown,
    sender: chrome.runtime.MessageSender,
  ) => Option.Option<Effect.Effect<unknown>>,
): void => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) =>
    Option.match(respond(message, sender), {
      onNone: () => undefined,
      onSome: (effect) => {
        void Effect.runPromise(effect).then(
          (response) => {
            sendResponse(response)
          },
          () => undefined,
        )
        return true
      },
    }),
  )
}
