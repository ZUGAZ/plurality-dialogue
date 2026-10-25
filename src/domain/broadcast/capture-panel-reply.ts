import { Effect } from "effect"
import { isPanelCaptureOk } from "../messaging/panel-capture-ok"
import type { PanelCaptureResponse } from "../messaging/panel-capture-response"
import { Messaging } from "../ports/messaging"
import { panelFailureReason } from "./panel-failure-reason"
import { PanelCaptureFailed } from "./panel-capture-failed"
import type { PanelCaptureOutcome } from "./panel-capture-outcome"
import { PanelCaptureSucceeded } from "./panel-capture-succeeded"
import type { PanelTarget } from "./panel-target"
import type { PanelFailedReason } from "./panel-failed"

export const capturePanelReply = Effect.fn("capturePanelReply")(function* (
  target: PanelTarget,
) {
  const messaging = yield* Messaging
  return yield* messaging.sendCaptureReply(target).pipe(
    Effect.map((response) => outcomeFromResponse(response, target)),
    Effect.catchTag("MessagingFault", (fault) =>
      Effect.succeed(failed(target, panelFailureReason(fault))),
    ),
  )
})

const outcomeFromResponse = (
  response: PanelCaptureResponse,
  target: PanelTarget,
): PanelCaptureOutcome => {
  if (!isPanelCaptureOk(response)) {
    return failed(target, panelFailureReason(response))
  }
  return succeeded(target, response.text)
}

const succeeded = (
  target: PanelTarget,
  text: string,
): PanelCaptureOutcome => {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return failed(target, "empty-reply")
  }
  return PanelCaptureSucceeded.make({
    panelId: target.panelId,
    providerId: target.providerId,
    text: trimmed,
  })
}

const failed = (target: PanelTarget, reason: PanelFailedReason) =>
  PanelCaptureFailed.make({
    panelId: target.panelId,
    providerId: target.providerId,
    reason,
  })
