import { Effect } from "effect"
import { createSignal } from "solid-js"
import { broadcastFill, broadcastFillSend } from "@domain/broadcast/broadcast"
import type { RunEffect } from "@ui/common/viewmodel/bind-viewmodel"
import {
  draftAfterFillOrSend,
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
  readonly fill: () => Effect.Effect<void>
  readonly sendAll: () => Effect.Effect<void>
}

export const createUnifiedInputViewModel = <Requirements>(
  _runEffect: RunEffect<Requirements>,
): UnifiedInputViewModel => {
  const [draft, setDraft] = createSignal("")
  const [status, setStatus] = createSignal<BarStatus>(idleStatus)

  const hasDraft = () => !isDraftEmpty(draft())
  const statusText = () => barStatusCopy(status())

  const clear = (): void => {
    setDraft("")
    setStatus(idleStatus)
  }

  const fill = () =>
    broadcastFill(draft()).pipe(
      Effect.catchTag("BroadcastTransportUnavailable", () =>
        Effect.sync(() => {
          setStatus({ kind: "fill-not-wired" })
          setDraft(draftAfterFillOrSend("fill", draft(), "failed"))
        }),
      ),
      Effect.catchTag("ComposerEmpty", () =>
        Effect.sync(() => {
          setStatus(idleStatus)
        }),
      ),
    )

  const sendAll = () =>
    broadcastFillSend(draft()).pipe(
      Effect.catchTag("BroadcastTransportUnavailable", () =>
        Effect.sync(() => {
          setStatus({ kind: "send-not-wired" })
          setDraft(draftAfterFillOrSend("send", draft(), "failed"))
        }),
      ),
      Effect.catchTag("ComposerEmpty", () =>
        Effect.sync(() => {
          setStatus(idleStatus)
        }),
      ),
    )

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
