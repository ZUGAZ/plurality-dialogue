import { Effect, Option } from "effect"
import { MessagingSendFailed } from "../../domain/ports/messaging"

export const sendRuntimeMessage = (
  message: unknown,
): Effect.Effect<unknown, MessagingSendFailed> =>
  Effect.tryPromise({
    try: () => chrome.runtime.sendMessage(message),
    catch: (cause) => new MessagingSendFailed({ cause }),
  })

export type RunPromise<Requirements> = <Success, Error>(
  effect: Effect.Effect<Success, Error, Requirements>,
) => Promise<Success>

export const subscribeRuntimeMessages = <Requirements>(
  respond: (
    message: unknown,
    sender: chrome.runtime.MessageSender,
  ) => Option.Option<Effect.Effect<unknown, never, Requirements>>,
  run: RunPromise<Requirements>,
): void => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) =>
    Option.match(respond(message, sender), {
      onNone: () => undefined,
      onSome: (effect) => {
        void run(effect).then(
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

export const subscribeRuntimeMessageEffects = <Requirements>(
  handle: (
    message: unknown,
    sender: chrome.runtime.MessageSender,
  ) => Effect.Effect<unknown | undefined, never, Requirements> | undefined,
  run: RunPromise<Requirements>,
): void => {
  chrome.runtime.onMessage.addListener((message, sender) => {
    const effect = handle(message, sender)
    if (effect === undefined) {
      return undefined
    }
    return run(effect)
  })
}
