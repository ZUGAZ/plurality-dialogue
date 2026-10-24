import { Effect, Option } from "effect"
import { createSignal } from "solid-js"
import { broadcastFill, broadcastFillSend } from "@domain/broadcast/broadcast"
import type { PendingImage } from "@domain/broadcast/pending-image"
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
import type { Storage } from "@domain/ports/storage"
import { getBuiltInProvider } from "@domain/provider/registry"
import type { RunEffect } from "@ui/common/viewmodel/bind-viewmodel"
import { holdFocusGuard, releaseFocusGuard } from "./focus-guard"
import { createImageAttachments } from "./image-attachments"
import {
  canClearBar,
  draftAfterFillOrSend,
  failedPanelsFromResults,
  failureLine,
  isDraftEmpty,
  statusText as barStatusCopy,
  type BarStatus,
  type ImagePreview,
  type LastBroadcast,
} from "./model"

export type UnifiedInputViewModel = {
  readonly draft: () => string
  readonly hasDraft: () => boolean
  readonly pendingImages: () => ReadonlyArray<PendingImage>
  readonly imagePreviews: () => ReadonlyArray<ImagePreview>
  readonly canClear: () => boolean
  readonly status: () => BarStatus
  readonly statusText: () => string
  readonly canRetry: () => boolean
  readonly setDraft: (text: string) => void
  readonly clear: () => void
  readonly clearStatus: () => void
  readonly fill: () => Effect.Effect<void, never, Messaging>
  readonly sendAll: () => Effect.Effect<void, never, Messaging | Storage>
  readonly retryFailed: () => Effect.Effect<void, never, Messaging | Storage>
  readonly addImageFiles: (
    files: ReadonlyArray<File>,
  ) => Effect.Effect<void, never, never>
  readonly removeImage: (id: string) => void
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
  const attachments = createImageAttachments({ status, setStatus })

  const hasDraft = () => !isDraftEmpty(draft())
  const canClear = () =>
    canClearBar(draft(), attachments.pendingImages().length)
  const statusText = () => barStatusCopy(status())
  const canRetry = () => lastBroadcast() !== null

  const clear = (): void => {
    setDraft("")
    setStatus(idleStatus)
    setLastBroadcast(null)
    attachments.clearImages()
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

  const sink = {
    draft,
    setDraft,
    setStatus,
    setLastBroadcast,
    focusPrompt,
    pendingImages: attachments.pendingImages,
    clearImages: attachments.clearImages,
  }
  const fill = () =>
    runBroadcast("fill", (request) => fillProgram(request, getPlan()), sink)
  const sendAll = () =>
    runBroadcast("send", (request) => sendProgram(request, getPlan()), sink)

  const retryFailed = () => {
    const previous = lastBroadcast()
    if (previous === null) {
      return Effect.void
    }
    const request: BroadcastRequest = {
      kind: previous.kind,
      prompt: previous.prompt,
      images: previous.images,
    }
    return broadcastProgram(
      request,
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
          setLastBroadcast(rememberedBroadcast(request, results))
          focusPrompt()
        },
      }),
    )
  }

  return {
    draft,
    hasDraft,
    pendingImages: attachments.pendingImages,
    imagePreviews: attachments.imagePreviews,
    canClear,
    status,
    statusText,
    canRetry,
    setDraft,
    clear,
    clearStatus,
    fill,
    sendAll,
    retryFailed,
    addImageFiles: attachments.addImageFiles,
    removeImage: attachments.removeImage,
    registerTextarea,
    focusPrompt,
  }
}

const idleStatus: BarStatus = { kind: "idle" }

type BroadcastRequest = {
  readonly kind: "fill" | "send"
  readonly prompt: string
  readonly images: ReadonlyArray<PendingImage>
}

type DraftSink = {
  readonly draft: () => string
  readonly setDraft: (text: string) => void
  readonly setStatus: (status: BarStatus) => void
  readonly setLastBroadcast: (broadcast: LastBroadcast | null) => void
  readonly focusPrompt: () => void
  readonly pendingImages: () => ReadonlyArray<PendingImage>
  readonly clearImages: () => void
}

const guardedBroadcast = <Error, Requirements>(
  request: BroadcastRequest,
  plan: BroadcastPlan,
  program: Effect.Effect<ReadonlyArray<PanelResult>, Error, Requirements>,
) =>
  Effect.sync(holdFocusGuard).pipe(
    Effect.zipRight(
      Effect.log(request.kind, {
        targets: plan.targets.length,
        images: request.images.length,
      }).pipe(
        Effect.zipRight(program),
        Effect.map((results) => [...plan.notReady, ...results]),
      ),
    ),
    Effect.ensuring(Effect.sync(releaseFocusGuard)),
  )

const fillProgram = (request: BroadcastRequest, plan: BroadcastPlan) =>
  guardedBroadcast(request, plan, broadcastFill(request.prompt, plan.targets))

const sendProgram = (request: BroadcastRequest, plan: BroadcastPlan) =>
  guardedBroadcast(
    request,
    plan,
    broadcastFillSend(request.prompt, request.images, {
      targets: plan.targets,
      panelIds: plan.panelIds,
    }),
  )

const broadcastProgram = (request: BroadcastRequest, plan: BroadcastPlan) =>
  request.kind === "fill"
    ? fillProgram(request, plan)
    : sendProgram(request, plan)

const runBroadcast = <Error, Requirements>(
  kind: "fill" | "send",
  program: (
    request: BroadcastRequest,
  ) => Effect.Effect<ReadonlyArray<PanelResult>, Error, Requirements>,
  sink: DraftSink,
) => {
  const request: BroadcastRequest = {
    kind,
    prompt: sink.draft(),
    images: kind === "send" ? sink.pendingImages() : [],
  }
  return program(request).pipe(
    Effect.match({
      onFailure: () => {
        sink.setStatus(idleStatus)
        sink.setLastBroadcast(null)
        sink.focusPrompt()
      },
      onSuccess: (results) => {
        const outcome = draftOutcome(results)
        sink.setDraft(draftAfterFillOrSend(kind, sink.draft(), outcome))
        if (kind === "send" && outcome === "succeeded") {
          sink.clearImages()
        }
        sink.setStatus(statusFromResults(results))
        sink.setLastBroadcast(rememberedBroadcast(request, results))
        sink.focusPrompt()
      },
    }),
  )
}

const rememberedBroadcast = (
  request: BroadcastRequest,
  results: ReadonlyArray<PanelResult>,
): LastBroadcast | null => {
  const failedPanels = failedPanelsFromResults(results)
  if (failedPanels.length === 0) {
    return null
  }
  return {
    kind: request.kind,
    prompt: request.prompt,
    images: request.images,
    failedPanels,
  }
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
