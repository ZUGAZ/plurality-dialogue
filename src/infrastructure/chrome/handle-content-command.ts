import { Effect, Either, Schema, pipe } from "effect"
import { isFillAndSubmit } from "../../domain/broadcast/commands/fill-and-submit"
import { isFillComposer } from "../../domain/broadcast/commands/fill-composer"
import {
  executePanelCommand,
  type PanelIdentity,
} from "../../domain/broadcast/execute-panel-command"
import { decodeIncomingMessage } from "../../domain/messaging/incoming-message"
import { PanelCommandResponse } from "../../domain/messaging/panel-command-response"
import type { ProviderPage } from "../../domain/ports/provider-page"

export const contentCommandEffect = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  identity: PanelIdentity,
): Effect.Effect<unknown, never, ProviderPage> | undefined => {
  if (sender.id !== undefined && sender.id !== chrome.runtime.id) {
    return undefined
  }
  const decoded = decodeIncomingMessage(message)
  if (Either.isLeft(decoded)) {
    return undefined
  }
  const incoming = decoded.right
  if (!isFillComposer(incoming) && !isFillAndSubmit(incoming)) {
    return undefined
  }
  return Effect.log(
    "panel command",
    incoming._tag,
    identity.providerId,
    identity.panelId,
  ).pipe(
    Effect.zipRight(executePanelCommand(incoming, identity)),
    Effect.map((response) =>
      pipe(
        Schema.encodeUnknownEither(PanelCommandResponse)(response),
        Either.match({
          onLeft: () => undefined,
          onRight: (encoded) => encoded,
        }),
      ),
    ),
    Effect.withLogSpan("contentCommand"),
    Effect.withLogSpan("content"),
  )
}
