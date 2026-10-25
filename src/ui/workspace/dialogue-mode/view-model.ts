import { Effect } from "effect"
import { batch, createSignal } from "solid-js"
import type { PanelTarget } from "@domain/broadcast/panel-target"
import {
  emptyDialogueSetup,
  type DialogueSetup,
} from "@domain/dialogue/dialogue-setup"
import {
  emptyDialogueTranscript,
  type DialogueTranscript,
} from "@domain/dialogue/dialogue-transcript"
import {
  dialogueEnginePanelId,
  enginePanelsFor,
  vendorCastSeats,
} from "@domain/dialogue/engine-panel-id"
import { resolveEngineTarget } from "@domain/dialogue/engine-target"
import { loadDialogueSetup } from "@domain/dialogue/load-dialogue-setup"
import { loadDialogueTranscript } from "@domain/dialogue/load-dialogue-transcript"
import {
  describeSetupSaveFailure,
  persistDialogueSetup,
} from "@domain/dialogue/persist-dialogue-setup"
import type { ResolvedCast } from "@domain/dialogue/resolve-cast"
import type { StartProblems } from "@domain/dialogue/start-dialogue"
import type { Storage } from "@domain/ports/storage"
import { isProviderId } from "@domain/provider/provider-id"
import type { RunEffect } from "@ui/common/viewmodel/bind-viewmodel"
import {
  toEngineStripItem,
  type EngineMount,
  type EngineStripItem,
} from "./engine-strip/model"
import {
  canAddVendorSeat,
  includeMeChecked,
  startProblemLines,
  transcriptRowsFor,
  vendorSeatDrafts,
  type DialoguePhase,
  type DialogueSeatDraft,
  type TranscriptRow,
  type WorkspaceMode,
} from "./model"
import {
  createDialogueRoom,
  type DialogueModeDeps,
} from "./room-actions"
import {
  appendVendorSeat,
  assignSeatRole,
  removeVendorSeat,
  renameSeat,
  retargetSeat,
  withIncludeMe,
  withTopic,
} from "./setup-draft"

export type { DialogueModeDeps }

export type DialogueModeViewModel = {
  readonly workspaceMode: () => WorkspaceMode
  readonly phase: () => DialoguePhase
  readonly setup: () => DialogueSetup
  readonly transcript: () => DialogueTranscript
  readonly engineRows: () => readonly EngineStripItem[]
  readonly startProblems: () => StartProblems | undefined
  readonly resolvedCast: () => ResolvedCast | undefined
  readonly seatDrafts: () => readonly DialogueSeatDraft[]
  readonly includeMe: () => boolean
  readonly canAddVendor: () => boolean
  readonly problemLines: () => readonly string[]
  readonly transcriptRows: () => readonly TranscriptRow[]
  readonly startDisabled: () => boolean
  readonly setWorkspaceMode: (
    mode: WorkspaceMode,
  ) => Effect.Effect<void, never, Storage>
  readonly setTopic: (topic: string) => Effect.Effect<void, never, Storage>
  readonly addVendorSeat: () => Effect.Effect<void, never, Storage>
  readonly removeVendorSeat: (
    castIndex: number,
  ) => Effect.Effect<void, never, Storage>
  readonly setSeatProvider: (
    castIndex: number,
    rawId: string,
  ) => Effect.Effect<void, never, Storage>
  readonly setSeatRole: (
    castIndex: number,
    roleId: string,
  ) => Effect.Effect<void, never, Storage>
  readonly setSeatName: (
    castIndex: number,
    name: string,
  ) => Effect.Effect<void, never, Storage>
  readonly setIncludeMe: (
    include: boolean,
  ) => Effect.Effect<void, never, Storage>
  readonly start: () => Effect.Effect<void, never, Storage>
  readonly newTopic: () => Effect.Effect<void, never, Storage>
  readonly reloadTranscript: () => Effect.Effect<void, never, Storage>
  readonly resolveTargetForCastIndex: (
    castIndex: number,
  ) => PanelTarget | undefined
  readonly onEngineLoad: (panelId: string) => void
}

export const createDialogueModeViewModel = (
  runEffect: RunEffect<Storage>,
  deps: DialogueModeDeps,
): DialogueModeViewModel => {
  const [workspaceMode, setWorkspaceModeSignal] =
    createSignal<WorkspaceMode>("compare")
  const [phase, setPhase] = createSignal<DialoguePhase>("setup")
  const [setup, setSetup] = createSignal<DialogueSetup>(emptyDialogueSetup)
  const [transcript, setTranscript] = createSignal<DialogueTranscript>(
    emptyDialogueTranscript,
  )
  const [storedEngines, setStoredEngines] = createSignal<
    readonly EngineMount[]
  >([])
  const [startProblems, setStartProblems] = createSignal<
    StartProblems | undefined
  >(undefined)
  const [loadedEngineIds, setLoadedEngineIds] = createSignal<
    ReadonlySet<string>
  >(new Set<string>())
  const [resolvedCast, setResolvedCast] = createSignal<
    ResolvedCast | undefined
  >(undefined)
  const [isStarting, setIsStarting] = createSignal(false)
  let roomGeneration = 0
  let reloadGeneration = 0

  const bumpRoom = (): number => {
    roomGeneration += 1
    return roomGeneration
  }

  const commitSetup = (
    next: DialogueSetup,
  ): Effect.Effect<void, never, Storage> => {
    if (next === setup()) {
      return Effect.void
    }
    setSetup(next)
    setStartProblems(undefined)
    return persistDialogueSetup(next).pipe(
      Effect.catchAll((error) =>
        Effect.logWarning(
          "dialogue setup did not save",
          describeSetupSaveFailure(error),
        ),
      ),
    )
  }

  const mountEngines = (current: DialogueSetup): void => {
    reloadGeneration += 1
    const generation = reloadGeneration
    batch(() => {
      setLoadedEngineIds(new Set<string>())
      setStoredEngines(
        enginePanelsFor(current).map((panel) => ({
          panelId: panel.panelId,
          providerId: panel.providerId,
          reloadGeneration: generation,
        })),
      )
    })
  }

  const clearEngines = (): void => {
    batch(() => {
      setStoredEngines([])
      setLoadedEngineIds(new Set<string>())
    })
    deps.forgetEngineFrames()
  }

  const room = createDialogueRoom(deps, {
    workspaceMode,
    setWorkspaceMode: setWorkspaceModeSignal,
    phase,
    setPhase,
    setup,
    transcript,
    setTranscript,
    setResolvedCast,
    setStartProblems,
    isStarting,
    setIsStarting,
    bumpRoom,
    roomIsCurrent: (generation) =>
      generation === roomGeneration && workspaceMode() === "dialogue",
    mountEngines,
    clearEngines,
    commitSetup,
  })

  const setSeatProvider = (castIndex: number, rawId: string) => {
    if (!isProviderId(rawId)) {
      return Effect.void
    }
    return commitSetup(retargetSeat(setup(), castIndex, rawId))
  }

  const setSeatRole = (castIndex: number, roleId: string) => {
    const known = deps.catalog().roles.some((role) => role.id === roleId)
    if (!known) {
      return Effect.void
    }
    return commitSetup(assignSeatRole(setup(), castIndex, roleId))
  }

  const addVendorSeat = () => {
    const providerId = deps.enabledProviderIds()[0]
    const role = deps.catalog().roles[0]
    if (providerId === undefined || role === undefined) {
      return Effect.void
    }
    return commitSetup(appendVendorSeat(setup(), providerId, role.id))
  }

  runEffect(
    Effect.gen(function* () {
      const loadedSetup = yield* loadDialogueSetup()
      const loadedTranscript = yield* loadDialogueTranscript()
      batch(() => {
        setSetup(loadedSetup)
        setTranscript(loadedTranscript)
      })
      if (workspaceMode() === "dialogue") {
        yield* room.reenter()
      }
    }).pipe(Effect.withLogSpan("loadDialogue")),
  )

  const engineRows = (): readonly EngineStripItem[] => {
    const ready = deps.framingReady()
    const loaded = loadedEngineIds()
    return storedEngines().map((row) =>
      toEngineStripItem(row, ready, loaded.has(row.panelId)),
    )
  }

  const resolveTargetForCastIndex = (
    castIndex: number,
  ): PanelTarget | undefined => {
    const seat = vendorCastSeats(setup()).find(
      (item) => item.castIndex === castIndex,
    )
    if (seat === undefined) {
      return undefined
    }
    return resolveEngineTarget(
      dialogueEnginePanelId(seat.vendorSeatIndex),
      seat.providerId,
      deps.engineFrames(),
    )
  }

  const onEngineLoad = (panelId: string): void => {
    setLoadedEngineIds((current) => {
      if (current.has(panelId)) {
        return current
      }
      const next = new Set(current)
      next.add(panelId)
      return next
    })
  }

  return {
    workspaceMode,
    phase,
    setup,
    transcript,
    engineRows,
    startProblems,
    resolvedCast,
    seatDrafts: () => vendorSeatDrafts(setup()),
    includeMe: () => includeMeChecked(setup()),
    canAddVendor: () =>
      canAddVendorSeat(
        setup(),
        deps.enabledProviderIds().length,
        deps.catalog().roles.length,
      ),
    problemLines: () => {
      const problems = startProblems()
      return problems === undefined ? [] : startProblemLines(problems)
    },
    transcriptRows: () =>
      transcriptRowsFor(transcript(), setup(), deps.catalog()),
    startDisabled: isStarting,
    setWorkspaceMode: room.setWorkspaceMode,
    setTopic: (topic) => commitSetup(withTopic(setup(), topic)),
    addVendorSeat,
    removeVendorSeat: (castIndex) =>
      commitSetup(removeVendorSeat(setup(), castIndex)),
    setSeatProvider,
    setSeatRole,
    setSeatName: (castIndex, name) =>
      commitSetup(renameSeat(setup(), castIndex, name)),
    setIncludeMe: (include) => commitSetup(withIncludeMe(setup(), include)),
    start: room.start,
    newTopic: room.newTopic,
    reloadTranscript: room.reloadTranscript,
    resolveTargetForCastIndex,
    onEngineLoad,
  }
}
