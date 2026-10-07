import { Effect, Option } from "effect"
import { createSignal } from "solid-js"
import { broadcastFill, broadcastFillSend } from "@domain/broadcast/broadcast"
import {
  isPanelFailed,
  type PanelFailed,
} from "@domain/broadcast/panel-failed"
import type { PanelResult } from "@domain/broadcast/panel-result"
import type {
  BroadcastPlan,
  VisiblePanel,
} from "@domain/broadcast/resolve-targets"
import type { Messaging } from "@domain/ports/messaging"
import { getBuiltInProvider } from "@domain/provider/registry"
import type { RunEffect } from "@ui/common/viewmodel/bind-viewmodel"
import { holdFocusGuard, releaseFocusGuard } from "./focus-guard"
import {
  draftAfterFillOrSend,
  failedPanelsFromResults,
  failureLine,
  isDraftEmpty,
  statusText as barStatusCopy,
  type BarStatus,
  type LastBroadcast,
} from "./model"

export type UnifiedInputViewModel = {
  readonly draft: () => string
  readonly hasDraft: () => boolean
  readonly status: () => BarStatus
  readonly statusText: () => string
  readonly canRetry: () => boolean
  readonly setDraft: (text: string) => void
  readonly clear: () => void
  readonly clearStatus: () => void
  readonly fill: () => Effect.Effect<void, never, Messaging>
  readonly sendAll: () => Effect.Effect<void, never, Messaging>
  readonly retryFailed: () => Effect.Effect<void, never, Messaging>
  readonly registerTextarea: (el: HTMLTextAreaElement) => void
  readonly focusPrompt: () => void
}

export const createUnifiedInputViewModel = <Requirements>(
  _runEffect: RunEffect<Requirements>,
  getPlan: () => BroadcastPlan,
  resolveTargets: (panels: ReadonlyArray<VisiblePanel>) => BroadcastPlan,
): UnifiedInputViewModel => {
  const [draft, setDraft] = createSignal("")
  const [status, setStatus] = createSignal<BarStatus>(idleStatus)
  const [lastBroadcast, setLastBroadcast] = createSignal<LastBroadcast | null>(
    null,
  )

  const hasDraft = () => !isDraftEmpty(draft())
  const statusText = () => barStatusCopy(status())
  const canRetry = () => lastBroadcast() !== null

  const clear = (): void => {
    setDraft("")
    setStatus(idleStatus)
    setLastBroadcast(null)
  }

  const clearStatus = (): void => {
    setStatus(idleStatus)
  }

  let textareaRef: HTMLTextAreaElement | null = null

  const registerTextarea = (el: HTMLTextAreaElement): void => {
    textareaRef = el
  }

  const focusPrompt = (): void => {
    const textarea = textareaRef
    if (textarea === null) {
      return
    }
    const caret = draft().length
    textarea.focus({ preventScroll: true })
    textarea.setSelectionRange(caret, caret)
  }

  const sink = { draft, setDraft, setStatus, setLastBroadcast, focusPrompt }
  const fill = () => runBroadcast("fill", getPlan, sink)
  const sendAll = () => runBroadcast("send", getPlan, sink)

  const retryFailed = () => {
    const previous = lastBroadcast()
    if (previous === null) {
      return Effect.void
    }
    return broadcastProgram(
      previous.kind,
      previous.prompt,
      resolveTargets(previous.failedPanels),
    ).pipe(
      Effect.match({
        onFailure: () => {
          setStatus(idleStatus)
          setLastBroadcast(null)
          focusPrompt()
        },
        onSuccess: (results) => {
          setStatus(statusFromResults(results))
          setLastBroadcast(
            rememberedBroadcast(previous.kind, previous.prompt, results),
          )
          focusPrompt()
        },
      }),
    )
  }

  return {
    draft,
    hasDraft,
    status,
    statusText,
    canRetry,
    setDraft,
    clear,
    clearStatus,
    fill,
    sendAll,
    retryFailed,
    registerTextarea,
    focusPrompt,
  }
}

const idleStatus: BarStatus = { kind: "idle" }

type DraftSink = {
  readonly draft: () => string
  readonly setDraft: (text: string) => void
  readonly setStatus: (status: BarStatus) => void
  readonly setLastBroadcast: (broadcast: LastBroadcast | null) => void
  readonly focusPrompt: () => void
}

const broadcastProgram = (
  kind: "fill" | "send",
  prompt: string,
  plan: BroadcastPlan,
) => {
  const program =
    kind === "fill"
      ? broadcastFill(prompt, plan.targets)
      : broadcastFillSend(prompt, plan.targets)
  return Effect.sync(holdFocusGuard).pipe(
    Effect.zipRight(
      Effect.log(kind, { targets: plan.targets.length }).pipe(
        Effect.zipRight(program),
        Effect.map((results) => [...plan.notReady, ...results]),
      ),
    ),
    Effect.ensuring(Effect.sync(releaseFocusGuard)),
  )
}

const runBroadcast = (
  kind: "fill" | "send",
  getPlan: () => BroadcastPlan,
  sink: DraftSink,
) => {
  const plan = getPlan()
  const prompt = sink.draft()
  return broadcastProgram(kind, prompt, plan).pipe(
    Effect.match({
      onFailure: () => {
        sink.setStatus(idleStatus)
        sink.setLastBroadcast(null)
        sink.focusPrompt()
      },
      onSuccess: (results) => {
        sink.setDraft(
          draftAfterFillOrSend(kind, sink.draft(), draftOutcome(results)),
        )
        sink.setStatus(statusFromResults(results))
        sink.setLastBroadcast(rememberedBroadcast(kind, prompt, results))
        sink.focusPrompt()
      },
    }),
  )
}

const rememberedBroadcast = (
  kind: "fill" | "send",
  prompt: string,
  results: ReadonlyArray<PanelResult>,
): LastBroadcast | null => {
  const failedPanels = failedPanelsFromResults(results)
  if (failedPanels.length === 0) {
    return null
  }
  return { kind, prompt, failedPanels }
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
