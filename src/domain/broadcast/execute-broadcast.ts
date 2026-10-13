import { Effect } from "effect"
import {
  isPanelCommandOk,
  type PanelCommandOk,
} from "../messaging/panel-command-ok"
import type { PanelCommandResponse } from "../messaging/panel-command-response"
import { Messaging } from "../ports/messaging"
import type { BroadcastCommand } from "./commands"
import { panelFailureReason } from "./panel-failure-reason"
import { PanelFailed, type PanelFailedReason } from "./panel-failed"
import type { PanelResult } from "./panel-result"
import { PanelSucceeded } from "./panel-succeeded"
import type { PanelTarget } from "./panel-target"

export const executeBroadcast = Effect.fn("executeBroadcast")(function* (
  command: BroadcastCommand,
  targets: ReadonlyArray<PanelTarget>,
) {
  const messaging = yield* Messaging
  return yield* Effect.forEach(
    targets,
    (target) =>
      messaging.sendToFrame(target, command).pipe(
        Effect.match({
          onFailure: (fault) => failedPanel(target, panelFailureReason(fault)),
          onSuccess: (response) => resultFromResponse(response, target),
        }),
      ),
    { concurrency: "unbounded" },
  )
})

const resultFromResponse = (
  response: PanelCommandResponse,
  target: PanelTarget,
): PanelResult => {
  if (isPanelCommandOk(response)) {
    return succeededPanel(response, target)
  }
  return failedPanel(target, panelFailureReason(response))
}

const succeededPanel = (
  response: PanelCommandOk,
  target: PanelTarget,
): PanelResult => {
  switch (response.verb) {
    case "filled":
    case "submitted":
      return PanelSucceeded.make({
        panelId: target.panelId,
        providerId: target.providerId,
        verb: response.verb,
      })
    case "temporary-chat":
      return failedPanel(target, "messaging-failed")
  }
}

const failedPanel = (target: PanelTarget, reason: PanelFailedReason) =>
  PanelFailed.make({
    panelId: target.panelId,
    providerId: target.providerId,
    reason,
  })
