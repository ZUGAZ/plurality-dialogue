import { Effect, Option } from "effect"
import { createSignal } from "solid-js"
import { broadcastFill, broadcastFillSend } from "@domain/broadcast/broadcast"
import {
  isPanelFailed,
  type PanelFailed,
} from "@domain/broadcast/panel-failed"
import type { PanelResult } from "@domain/broadcast/panel-result"
import type { BroadcastPlan } from "@domain/broadcast/resolve-targets"
import type { Messaging } from "@domain/ports/messaging"
import { getBuiltInProvider } from "@domain/provider/registry"
import type { RunEffect } from "@ui/common/viewmodel/bind-viewmodel"
import {
  draftAfterFillOrSend,
  failureLine,
  isDraftEmpty,
  statusText as barStatusCopy,
  type BarStatus,
} from "./model"

export type UnifiedInputViewModel = {
  readonly draft: () => string
  readonly hasDraft: () => boolean
  readonly status: () => BarStatus
  readonly statusText: () => string
  readonly setDraft: (text: string) => void
  readonly clear: () => void
  readonly fill: () => Effect.Effect<void, never, Messaging>
  readonly sendAll: () => Effect.Effect<void, never, Messaging>
}

export const createUnifiedInputViewModel = <Requirements>(
  _runEffect: RunEffect<Requirements>,
  getPlan: () => BroadcastPlan,
): UnifiedInputViewModel => {
  const [draft, setDraft] = createSignal("")
  const [status, setStatus] = createSignal<BarStatus>(idleStatus)

  const hasDraft = () => !isDraftEmpty(draft())
  const statusText = () => barStatusCopy(status())

  const clear = (): void => {
    setDraft("")
    setStatus(idleStatus)
  }

  const sink = { draft, setDraft, setStatus }
  const fill = () => runBroadcast("fill", getPlan, sink)
  const sendAll = () => runBroadcast("send", getPlan, sink)

  return {
    draft,
    hasDraft,
    status,
    statusText,
    setDraft,
    clear,
    fill,
    sendAll,
  }
}

const idleStatus: BarStatus = { kind: "idle" }

type DraftSink = {
  readonly draft: () => string
  readonly setDraft: (text: string) => void
  readonly setStatus: (status: BarStatus) => void
}

const runBroadcast = (
  kind: "fill" | "send",
  getPlan: () => BroadcastPlan,
  sink: DraftSink,
) => {
  const plan = getPlan()
  const program =
    kind === "fill"
      ? broadcastFill(sink.draft(), plan.targets)
      : broadcastFillSend(sink.draft(), plan.targets)
  return Effect.log(kind, { targets: plan.targets.length }).pipe(
    Effect.zipRight(program),
    Effect.map((results) => [...plan.notReady, ...results]),
    Effect.match({
      onFailure: () => {
        sink.setStatus(idleStatus)
      },
      onSuccess: (results) => {
        sink.setDraft(
          draftAfterFillOrSend(kind, sink.draft(), draftOutcome(results)),
        )
        sink.setStatus(statusFromResults(results))
      },
    }),
  )
}

const draftOutcome = (
  results: ReadonlyArray<PanelResult>,
): "failed" | "succeeded" =>
  results.some(isPanelFailed) ? "failed" : "succeeded"

const statusFromResults = (results: ReadonlyArray<PanelResult>): BarStatus => {
  const failed = results.filter(isPanelFailed)
  if (failed.length === 0) {
    return idleStatus
  }
  return { kind: "notice", text: failureLine(failed.map(failureItem)) }
}

const failureItem = (failed: PanelFailed) => ({
  panelId: failed.panelId,
  label: Option.match(getBuiltInProvider(failed.providerId), {
    onNone: () => failed.providerId,
    onSome: (provider) => provider.displayName,
  }),
})
