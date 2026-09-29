import { Effect, Either, Schema, pipe } from "effect"
import {
  EnsureFramingRulesRequest,
  FramingRulesReady,
  FramingRulesResponse,
  FramingSessionRulesUpdateFailed,
  FramingTabIdUnavailable,
  isFramingRulesReady,
} from "../../domain/messaging/ensure-framing-rules"
import { MessagingSendFailed } from "../../domain/ports/messaging"
import { collectWorkspaceTabIds } from "../../domain/workspace/framing-session-rules"
import { TabIdUnavailable } from "../../domain/workspace/tab-id-unavailable"
import { chromeErrorMessage } from "./chrome-error-message"
import { applyFramingSessionRules } from "./declarative-net-request"
import { sendRuntimeMessage } from "./runtime-messaging"
import { listTabIdsForDocumentUrls } from "./tabs"

export const sendFramingHandshake = (
  message: unknown,
): Effect.Effect<unknown, MessagingSendFailed> =>
  pipe(
    Schema.decodeUnknownEither(EnsureFramingRulesRequest)(message),
    Either.match({
      onLeft: () => sendRuntimeMessage(message),
      onRight: (request) =>
        applyFramingOnPage(request).pipe(
          Effect.matchEffect({
            onSuccess: () => Effect.succeed(encodeFramingReady()),
            onFailure: (error) =>
              sendRuntimeMessage(message).pipe(
                Effect.match({
                  onSuccess: (swResponse) =>
                    readyOrPageFailure(swResponse, error),
                  onFailure: () => encodePageFailure(error),
                }),
              ),
          }),
        ),
    }),
  )

const applyFramingOnPage = (request: EnsureFramingRulesRequest) =>
  tabIdsForRequest(request.tabId).pipe(
    Effect.flatMap((tabIds) =>
      Effect.forEach(tabIds, applyFramingSessionRules, { discard: true }),
    ),
  )

const tabIdsForRequest = (
  requestedTabId: number | undefined,
): Effect.Effect<readonly number[], TabIdUnavailable> => {
  const fromRequest = collectWorkspaceTabIds([requestedTabId])
  if (fromRequest.length > 0) {
    return Effect.succeed(fromRequest)
  }
  if (typeof location === "undefined") {
    return Effect.fail(new TabIdUnavailable())
  }
  if (!location.pathname.endsWith("/workspace.html")) {
    return Effect.fail(new TabIdUnavailable())
  }
  return listTabIdsForDocumentUrls([location.href])
}

const encodeFramingReady = (): unknown =>
  encodeOrFallback(FramingRulesReady, FramingRulesReady.make({}))

const encodePageFailure = (error: {
  readonly _tag: string
  readonly cause?: unknown
}): unknown => {
  if (error._tag === "TabIdUnavailable") {
    return encodeOrFallback(
      FramingTabIdUnavailable,
      FramingTabIdUnavailable.make({}),
    )
  }
  return encodeOrFallback(
    FramingSessionRulesUpdateFailed,
    FramingSessionRulesUpdateFailed.make({
      message: chromeErrorMessage(
        error.cause,
        "Could not apply framing rules",
      ),
    }),
  )
}

const encodeOrFallback = <A, I>(
  schema: Schema.Schema<A, I>,
  value: A,
): unknown =>
  pipe(
    Schema.encodeUnknownEither(schema)(value),
    Either.match({
      onLeft: () => value,
      onRight: (encoded) => encoded,
    }),
  )

const readyOrPageFailure = (
  swResponse: unknown,
  error: { readonly _tag: string; readonly cause?: unknown },
): unknown =>
  pipe(
    Schema.decodeUnknownEither(FramingRulesResponse)(swResponse),
    Either.match({
      onLeft: () => encodePageFailure(error),
      onRight: (decoded) =>
        isFramingRulesReady(decoded) ? swResponse : encodePageFailure(error),
    }),
  )
