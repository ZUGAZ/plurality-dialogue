import { Effect, Layer } from "effect"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { createRoot } from "solid-js"
import { isFillAndSubmit } from "@domain/broadcast/commands/fill-and-submit"
import { isFillComposer } from "@domain/broadcast/commands/fill-composer"
import { PanelFailed } from "@domain/broadcast/panel-failed"
import { PanelTarget } from "@domain/broadcast/panel-target"
import type {
  BroadcastPlan,
  VisiblePanel,
} from "@domain/broadcast/resolve-targets"
import { PanelCommandErr } from "@domain/messaging/panel-command-err"
import { PanelCommandOk } from "@domain/messaging/panel-command-ok"
import type { PanelCommandResponse } from "@domain/messaging/panel-command-response"
import {
  inMemoryMessagingLayer,
  type InMemoryFrameMessaging,
  type RecordedFrameSend,
} from "@domain/ports/in-memory-messaging"
import { inMemoryStorageLayer } from "@domain/ports/in-memory-storage"
import { createUnifiedInputViewModel } from "./view-model"

const quiet = <Success, Error, Requirements>(
  layer: Layer.Layer<Success, Error, Requirements>,
): Layer.Layer<Success, Error, Requirements> =>
  Layer.merge(layer, silentLoggerLayer)

const target = (
  panelId: string,
  providerId: "chatgpt" | "claude" | "gemini",
  frameId: number,
) => PanelTarget.make({ panelId, providerId, tabId: 1, frameId })

export const chatgpt = target("panel-1", "chatgpt", 10)
export const claude = target("panel-2", "claude", 11)
export const gemini = target("panel-3", "gemini", 12)

const targetsById = new Map(
  [chatgpt, claude, gemini].map((row) => [row.panelId, row]),
)

export const frameNotReady = (panel: VisiblePanel) =>
  PanelFailed.make({
    panelId: panel.panelId,
    providerId: panel.providerId,
    reason: "frame-not-ready",
  })

export const broadcastPrompt = (
  message: RecordedFrameSend["message"],
): string | undefined => {
  if (isFillComposer(message) || isFillAndSubmit(message)) {
    return message.prompt
  }
  return undefined
}

export const replyOk = (
  replies: Map<string, PanelCommandResponse>,
  row: PanelTarget,
  verb: "filled" | "submitted",
) => {
  replies.set(
    row.panelId,
    PanelCommandOk.make({
      verb,
      providerId: row.providerId,
      panelId: row.panelId,
    }),
  )
}

export const replyMiss = (
  replies: Map<string, PanelCommandResponse>,
  row: PanelTarget,
) => {
  replies.set(
    row.panelId,
    PanelCommandErr.make({
      providerId: row.providerId,
      panelId: row.panelId,
      reason: "composer-not-found",
    }),
  )
}

export const sentIdsSince = (
  frames: InMemoryFrameMessaging,
  start: number,
) => frames.sent.slice(start).map((row) => row.target.panelId)

export const openRetrySession = (
  panelIds: ReadonlyArray<string> = ["panel-1", "panel-2", "panel-3"],
) => {
  const replies = new Map<string, PanelCommandResponse>()
  const sent: RecordedFrameSend[] = []
  const frames: InMemoryFrameMessaging = { replies, sent }
  const announced = new Set<string>([
    chatgpt.panelId,
    claude.panelId,
    gemini.panelId,
  ])
  let slotIds = panelIds
  let plan: BroadcastPlan = {
    targets: [chatgpt, claude],
    notReady: [],
    panelIds: slotIds,
  }
  const resolveTargets = (
    panels: ReadonlyArray<VisiblePanel>,
  ): BroadcastPlan => {
    const targets: PanelTarget[] = []
    const notReady: PanelFailed[] = []
    for (const panel of panels) {
      const hello = targetsById.get(panel.panelId)
      if (hello === undefined || !announced.has(panel.panelId)) {
        notReady.push(frameNotReady(panel))
        continue
      }
      targets.push(hello)
    }
    return { targets, notReady, panelIds: slotIds }
  }
  const root = createRoot((dispose) => ({
    vm: createUnifiedInputViewModel(
      () => undefined,
      () => plan,
      resolveTargets,
    ),
    dispose,
  }))
  return {
    ...root,
    frames,
    replies,
    announced,
    layer: quiet(
      Layer.mergeAll(
        inMemoryMessagingLayer(() => Effect.succeed({}), frames),
        inMemoryStorageLayer(),
      ),
    ),
    setPlan: (next: BroadcastPlan) => {
      plan = next
      slotIds = next.panelIds
    },
  }
}
