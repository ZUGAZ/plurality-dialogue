import { Effect, Either, Option, Schema, pipe } from "effect"
import {
  FramingRulesReady,
  FramingSessionRulesUpdateFailed,
  FramingTabIdUnavailable,
  isEnsureFramingRulesRequest,
} from "../../domain/messaging/ensure-framing-rules"
import { decodeIncomingMessage } from "../../domain/messaging/incoming-message"
import {
  WorkspacePingResponse,
  isWorkspacePingRequest,
} from "../../domain/messaging/workspace-ping"
import { parseWorkspaceTabId } from "../../domain/workspace/framing-session-rules"
import { applyFramingSessionRules } from "./declarative-net-request"

const encodeReply = <A, I>(schema: Schema.Schema<A, I>, value: A): unknown =>
  pipe(
    Schema.encodeUnknownEither(schema)(value),
    Either.match({
      onLeft: () => value,
      onRight: (encoded) => encoded,
    }),
  )

const pingReply = (): Option.Option<Effect.Effect<unknown>> =>
  Option.some(
    Effect.succeed(
      encodeReply(WorkspacePingResponse, WorkspacePingResponse.make({})),
    ),
  )

const ensureFramingRulesReply = (
  senderTabId: number | undefined,
): Effect.Effect<unknown> =>
  pipe(
    parseWorkspaceTabId(senderTabId),
    Either.match({
      onLeft: () =>
        Effect.succeed(
          encodeReply(
            FramingTabIdUnavailable,
            FramingTabIdUnavailable.make({}),
          ),
        ),
      onRight: (tabId) =>
        applyFramingSessionRules(tabId).pipe(
          Effect.match({
            onFailure: () =>
              encodeReply(
                FramingSessionRulesUpdateFailed,
                FramingSessionRulesUpdateFailed.make({}),
              ),
            onSuccess: () =>
              encodeReply(FramingRulesReady, FramingRulesReady.make({})),
          }),
        ),
    }),
  )

export const handleBackgroundMessage = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
): Option.Option<Effect.Effect<unknown>> =>
  pipe(
    decodeIncomingMessage(message),
    Either.match({
      onLeft: () => Option.none(),
      onRight: (incoming) => {
        if (isWorkspacePingRequest(incoming)) {
          return pingReply()
        }
        if (isEnsureFramingRulesRequest(incoming)) {
          return Option.some(ensureFramingRulesReply(sender.tab?.id))
        }
        return Option.none()
      },
    }),
  )
