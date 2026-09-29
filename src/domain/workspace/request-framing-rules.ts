import { Data, Effect, Option, Schema } from "effect"
import {
  EnsureFramingRulesRequest,
  FramingRulesResponse,
  isFramingRulesReady,
  isFramingSessionRulesUpdateFailed,
  isFramingTabIdUnavailable,
} from "../messaging/ensure-framing-rules"
import { Messaging } from "../ports/messaging"
import { Tabs } from "../ports/tabs"

export class FramingHandshakeFailed extends Data.TaggedError(
  "FramingHandshakeFailed",
)<{
  readonly reason: string
}> {}

export const requestFramingRules = Effect.fn("requestFramingRules")(
  function* () {
    const tabs = yield* Tabs
    const messaging = yield* Messaging
    const tabId = yield* tabs.currentTabId().pipe(Effect.option)
    const request = Option.match(tabId, {
      onNone: () => EnsureFramingRulesRequest.make({}),
      onSome: (id) => EnsureFramingRulesRequest.make({ tabId: id }),
    })
    const encodedRequest = yield* Schema.encode(EnsureFramingRulesRequest)(
      request,
    )
    const rawResponse = yield* messaging.send(encodedRequest)
    const response = yield* Schema.decodeUnknown(FramingRulesResponse)(
      rawResponse,
    )
    if (isFramingRulesReady(response)) {
      return response
    }
    return yield* Effect.fail(handshakeFailure(response))
  },
)

const handshakeFailure = (
  response: FramingRulesResponse,
): FramingHandshakeFailed => {
  if (isFramingTabIdUnavailable(response)) {
    return new FramingHandshakeFailed({
      reason: "Could not identify this workspace tab",
    })
  }
  if (isFramingSessionRulesUpdateFailed(response)) {
    return new FramingHandshakeFailed({
      reason: response.message ?? "Could not apply framing rules",
    })
  }
  return new FramingHandshakeFailed({
    reason: "Unexpected framing reply",
  })
}
