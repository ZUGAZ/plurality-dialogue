import { Effect } from "effect"
import { isPanelCommandErr } from "../messaging/panel-command-err"
import type { PanelCommandResponse } from "../messaging/panel-command-response"
import { Messaging, type MessagingFault } from "../ports/messaging"
import { OpenTemporaryChat } from "./commands/open-temporary-chat"
import type { PanelTarget } from "./panel-target"

export const requestTemporaryChat = Effect.fn("requestTemporaryChat")(function* (
  targets: readonly PanelTarget[],
) {
  const messaging = yield* Messaging
  yield* Effect.forEach(
    targets,
    (target) =>
      messaging.sendToFrame(target, OpenTemporaryChat.make({})).pipe(
        Effect.tap((response) => logCommandErr(response, target)),
        Effect.catchTag("MessagingFault", (fault) => logFault(fault, target)),
      ),
    { concurrency: "unbounded" },
  )
})

const logCommandErr = (response: PanelCommandResponse, target: PanelTarget) =>
  isPanelCommandErr(response)
    ? Effect.logWarning(
        "temporary chat failed",
        response.reason,
        target.providerId,
        target.panelId,
      )
    : Effect.void

const logFault = (fault: MessagingFault, target: PanelTarget) =>
  Effect.logWarning(
    "temporary chat failed",
    fault,
    target.providerId,
    target.panelId,
  )
