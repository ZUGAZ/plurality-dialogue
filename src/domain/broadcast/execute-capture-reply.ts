import { Effect } from "effect"
import {
  isPanelCommandErr,
  PanelCommandErr,
  type PanelCommandErrReason,
} from "../messaging/panel-command-err"
import { PanelCaptureOk } from "../messaging/panel-capture-ok"
import { ProviderPage } from "../ports/provider-page"
import type { PanelIdentity } from "./execute-panel-command"

type CaptureWire = PanelCaptureOk | PanelCommandErr

export const executeCaptureReply = Effect.fn("executeCaptureReply")(function* (
  identity: PanelIdentity,
) {
  const page = yield* ProviderPage
  return yield* page.captureReply().pipe(
    Effect.flatMap((reply) => acceptCapturedText(identity, reply.text)),
    Effect.catchTag("ReplyNotFound", () =>
      commandErr(identity, "reply-not-found"),
    ),
    Effect.catchTag("ReplyStillStreaming", () =>
      commandErr(identity, "reply-still-streaming"),
    ),
    Effect.catchTag("EmptyReply", () => commandErr(identity, "empty-reply")),
    Effect.catchTag("CaptureUnsupported", () =>
      commandErr(identity, "capture-unsupported"),
    ),
    Effect.tap((response) =>
      isPanelCommandErr(response)
        ? Effect.logWarning(
            "panel command failed",
            response.reason,
            identity.providerId,
            identity.panelId,
          )
        : Effect.void,
    ),
  )
})

const acceptCapturedText = (
  identity: PanelIdentity,
  text: string,
): Effect.Effect<CaptureWire> => {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return commandErr(identity, "empty-reply")
  }
  return Effect.succeed(
    PanelCaptureOk.make({
      text: trimmed,
      providerId: identity.providerId,
      panelId: identity.panelId,
    }),
  )
}

const commandErr = (
  identity: PanelIdentity,
  reason: PanelCommandErrReason,
): Effect.Effect<CaptureWire> =>
  Effect.succeed(
    PanelCommandErr.make({
      providerId: identity.providerId,
      panelId: identity.panelId,
      reason,
    }),
  )
