import { Data, Effect, Schema } from "effect"
import {
  EnsureFramingRulesRequest,
  FramingRulesResponse,
  isFramingRulesReady,
} from "../messaging/ensure-framing-rules"
import { Messaging } from "../ports/messaging"
import { Tabs } from "../ports/tabs"

export class FramingHandshakeFailed extends Data.TaggedError(
  "FramingHandshakeFailed",
) {}

export const requestFramingRules = Effect.fn("requestFramingRules")(
  function* () {
    const tabs = yield* Tabs
    yield* tabs.currentTabId()
    const messaging = yield* Messaging
    const encodedRequest = yield* Schema.encode(EnsureFramingRulesRequest)(
      EnsureFramingRulesRequest.make({}),
    )
    const rawResponse = yield* messaging.send(encodedRequest)
    const response = yield* Schema.decodeUnknown(FramingRulesResponse)(
      rawResponse,
    )
    if (isFramingRulesReady(response)) {
      return response
    }
    return yield* Effect.fail(new FramingHandshakeFailed())
  },
)
