import { Effect } from "effect"
import { isPanelCommandOk } from "../messaging/panel-command-ok"
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
    return PanelSucceeded.make({
      panelId: target.panelId,
      providerId: target.providerId,
      verb: response.verb,
    })
  }
  return failedPanel(target, panelFailureReason(response))
}

const failedPanel = (target: PanelTarget, reason: PanelFailedReason) =>
  PanelFailed.make({
    panelId: target.panelId,
    providerId: target.providerId,
    reason,
  })
