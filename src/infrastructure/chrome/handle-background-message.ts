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
import {
  nonEmptyDocumentUrls,
  resolveFramingTabId,
} from "../../domain/workspace/framing-session-rules"
import { workspacePagePath } from "../../domain/workspace/workspace-page"
import { chromeErrorMessage } from "./chrome-error-message"
import { applyFramingSessionRules } from "./declarative-net-request"
import { extensionPageUrl } from "./extension-page-url"
import { listTabIdsForDocumentUrls } from "./tabs"

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

const framingReadyReply = () =>
  encodeReply(FramingRulesReady, FramingRulesReady.make({}))

const framingTabIdUnavailableReply = () =>
  encodeReply(FramingTabIdUnavailable, FramingTabIdUnavailable.make({}))

const framingRulesUpdateFailedReply = (cause: unknown) =>
  encodeReply(
    FramingSessionRulesUpdateFailed,
    FramingSessionRulesUpdateFailed.make({
      message: chromeErrorMessage(cause, "Could not apply framing rules"),
    }),
  )

const applyRulesToTabs = (
  tabIds: readonly number[],
): Effect.Effect<unknown> =>
  Effect.forEach(tabIds, applyFramingSessionRules, { discard: true }).pipe(
    Effect.match({
      onFailure: (error) => framingRulesUpdateFailedReply(error.cause),
      onSuccess: framingReadyReply,
    }),
  )

const tabIdsFromWorkspaceDocuments = (
  senderUrl: string | undefined,
): Effect.Effect<readonly number[], never> =>
  listTabIdsForDocumentUrls(
    nonEmptyDocumentUrls([senderUrl, extensionPageUrl(workspacePagePath)]),
  ).pipe(Effect.orElseSucceed(() => []))

const ensureFramingRulesReply = (
  senderTabId: number | undefined,
  requestedTabId: number | undefined,
  senderUrl: string | undefined,
): Effect.Effect<unknown> =>
  pipe(
    resolveFramingTabId(senderTabId, requestedTabId),
    Either.match({
      onLeft: () =>
        tabIdsFromWorkspaceDocuments(senderUrl).pipe(
          Effect.flatMap((tabIds) =>
            tabIds.length === 0
              ? Effect.succeed(framingTabIdUnavailableReply())
              : applyRulesToTabs(tabIds),
          ),
        ),
      onRight: (tabId) => applyRulesToTabs([tabId]),
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
          return Option.some(
            ensureFramingRulesReply(
              sender.tab?.id,
              incoming.tabId,
              sender.url,
            ),
          )
        }
        return Option.none()
      },
    }),
  )
