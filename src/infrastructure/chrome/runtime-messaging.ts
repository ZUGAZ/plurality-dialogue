import { Either } from "effect"
import type { ParseError } from "effect/ParseResult"

export const subscribeRuntimeMessages = (
  respond: (message: unknown) => Either.Either<unknown, ParseError>,
): void => {
  chrome.runtime.onMessage.addListener(
    (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void,
    ) =>
      Either.match(respond(message), {
        onLeft: () => undefined,
        onRight: (response) => {
          sendResponse(response)
          return undefined
        },
      }),
  )
}
