import { Effect } from "effect"
import { batch, createEffect, createSignal, on, untrack } from "solid-js"
import type { PanelTarget } from "@domain/broadcast/panel-target"
import type { DialogueSetup } from "@domain/dialogue/dialogue-setup"
import type { DialogueTranscript } from "@domain/dialogue/dialogue-transcript"
import {
  initialCursor,
  pinCursor,
  resetFloor,
  type FloorState,
} from "@domain/dialogue/floor-state"
import type { ResolvedCast } from "@domain/dialogue/resolve-cast"
import type { Messaging } from "@domain/ports/messaging"
import type { Storage } from "@domain/ports/storage"
import type { RunEffect } from "@ui/common/viewmodel/bind-viewmodel"
import {
  castChips,
  castSpeaker,
  composerPrefill,
  cursorIsYou,
  type CastChip,
  type FailedBubble,
} from "./model"
import { createTurnActions } from "./turn-actions"

export type DialogueFloorHost = {
  readonly phase: () => "setup" | "running"
  readonly setup: () => DialogueSetup
  readonly transcript: () => DialogueTranscript
  readonly resolvedCast: () => ResolvedCast | undefined
  readonly resolveTargetForCastIndex: (
    castIndex: number,
  ) => PanelTarget | undefined
  readonly reloadTranscript: () => Promise<void>
}

export type DialogueFloorViewModel = {
  readonly floorState: () => FloorState
  readonly composerDraft: () => string
  readonly setComposerDraft: (text: string) => void
  readonly failures: () => readonly FailedBubble[]
  readonly turnGeneration: () => number
  readonly chips: () => readonly CastChip[]
  readonly cursorIsYou: () => boolean
  readonly speakerAt: (castIndex: number) => string
  readonly pin: (index: number) => Effect.Effect<void>
  readonly next: () => Effect.Effect<void, never, Messaging | Storage>
  readonly sendUserLine: (text: string) => Effect.Effect<void, never, Storage>
}

export const createDialogueFloorViewModel = (
  runEffect: RunEffect<Messaging | Storage>,
  host: DialogueFloorHost,
): DialogueFloorViewModel => {
  void runEffect
  const [floorState, setFloorState] = createSignal<FloorState>(resetFloor())
  const [composerDraft, setComposerDraftSignal] = createSignal("")
  const [failures, setFailures] = createSignal<readonly FailedBubble[]>([])
  const [turnGeneration, setTurnGeneration] = createSignal(0)
  let seenPhase: "setup" | "running" | undefined

  const setComposerDraft = (text: string): void => {
    setComposerDraftSignal(text)
  }

  // Node tests load Solid's server build, where createEffect is a no-op.
  // Reading the floor still applies a phase change; the browser effect does too.
  const applyPhase = (phase: "setup" | "running"): void => {
    if (phase === seenPhase) {
      return
    }
    seenPhase = phase
    if (phase === "running") {
      const setup = host.setup()
      batch(() => {
        setFloorState({ cursor: initialCursor(setup), busy: false })
        setComposerDraft(composerPrefill(setup, host.transcript()))
      })
      return
    }
    batch(() => {
      setFloorState(resetFloor())
      setFailures([])
      setTurnGeneration((current) => current + 1)
    })
  }

  const syncPhase = (): void => {
    applyPhase(host.phase())
  }

  syncPhase()
  createEffect(
    on(host.phase, () => {
      syncPhase()
    }),
  )

  const pin = (index: number): Effect.Effect<void> =>
    Effect.sync(() => {
      syncPhase()
      if (host.phase() !== "running") {
        return
      }
      setFloorState((state) =>
        pinCursor(state, index, host.setup().cast.length),
      )
    })

  const turns = createTurnActions({
    host,
    floorState,
    setFloorState,
    failures,
    setFailures,
    setComposerDraft,
    turnGeneration,
    syncPhase,
  })

  const synced = <Value>(read: () => Value): Value => {
    untrack(syncPhase)
    return read()
  }

  return {
    floorState: () => synced(floorState),
    composerDraft: () => synced(composerDraft),
    setComposerDraft,
    failures: () => synced(failures),
    turnGeneration: () => synced(turnGeneration),
    chips: () => synced(() => castChips(host.setup().cast)),
    cursorIsYou: () =>
      synced(() => cursorIsYou(host.setup().cast, floorState().cursor)),
    speakerAt: (castIndex) =>
      synced(() => castSpeaker(host.setup().cast, castIndex)),
    pin,
    next: turns.next,
    sendUserLine: turns.sendUserLine,
  }
}
