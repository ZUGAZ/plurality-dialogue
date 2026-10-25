import { Clock, Effect, Either, Option } from "effect"
import { appendTranscriptEntry } from "@domain/dialogue/append-transcript-entry"
import { clearDialogueTranscript } from "@domain/dialogue/clear-dialogue-transcript"
import type { DialogueSetup } from "@domain/dialogue/dialogue-setup"
import {
  emptyDialogueTranscript,
  type DialogueTranscript,
} from "@domain/dialogue/dialogue-transcript"
import { enginePanelsFor } from "@domain/dialogue/engine-panel-id"
import { loadDialogueTranscript } from "@domain/dialogue/load-dialogue-transcript"
import { resolveCast, type ResolvedCast } from "@domain/dialogue/resolve-cast"
import { startDialogue, type StartPlan, type StartProblems } from "@domain/dialogue/start-dialogue"
import { waitEngineTargets } from "@domain/dialogue/wait-engine-targets"
import type { PanelTarget } from "@domain/broadcast/panel-target"
import type { Storage } from "@domain/ports/storage"
import type { ProviderId } from "@domain/provider/provider-id"
import type { RoleCatalog } from "@domain/role/role"
import type { DialoguePhase, WorkspaceMode } from "./model"
import { withTopic } from "./setup-draft"

const engineTargetTimeoutMs = 15_000

export type DialogueModeDeps = {
  readonly framingReady: () => boolean
  readonly engineFrames: () => readonly PanelTarget[]
  readonly forgetEngineFrames: () => void
  readonly enabledProviderIds: () => readonly ProviderId[]
  readonly catalog: () => RoleCatalog
}

export type DialogueRoomState = {
  readonly workspaceMode: () => WorkspaceMode
  readonly setWorkspaceMode: (mode: WorkspaceMode) => void
  readonly phase: () => DialoguePhase
  readonly setPhase: (phase: DialoguePhase) => void
  readonly setup: () => DialogueSetup
  readonly transcript: () => DialogueTranscript
  readonly setTranscript: (transcript: DialogueTranscript) => void
  readonly setResolvedCast: (resolved: ResolvedCast | undefined) => void
  readonly setStartProblems: (problems: StartProblems | undefined) => void
  readonly isStarting: () => boolean
  readonly setIsStarting: (starting: boolean) => void
  readonly bumpRoom: () => number
  readonly roomIsCurrent: (generation: number) => boolean
  readonly mountEngines: (current: DialogueSetup) => void
  readonly clearEngines: () => void
  readonly commitSetup: (
    next: DialogueSetup,
  ) => Effect.Effect<void, never, Storage>
}

export const createDialogueRoom = (
  deps: DialogueModeDeps,
  state: DialogueRoomState,
) => {
  const reloadTranscript = (): Effect.Effect<void, never, Storage> =>
    loadDialogueTranscript().pipe(
      Effect.tap((loaded) => Effect.sync(() => state.setTranscript(loaded))),
      Effect.asVoid,
    )

  return {
    reloadTranscript,
    reenter: () => enterDialogue(deps, state),
    setWorkspaceMode: (mode: WorkspaceMode) => switchMode(deps, state, mode),
    start: () => beginStart(deps, state),
  }
}

const switchMode = (
  deps: DialogueModeDeps,
  state: DialogueRoomState,
  mode: WorkspaceMode,
): Effect.Effect<void, never, Storage> => {
  if (mode === state.workspaceMode()) {
    return Effect.void
  }
  state.setWorkspaceMode(mode)
  return mode === "compare" ? leaveDialogue(state) : enterDialogue(deps, state)
}

const leaveDialogue = (state: DialogueRoomState): Effect.Effect<void> =>
  Effect.sync(() => {
    state.bumpRoom()
    state.setPhase("setup")
    state.setResolvedCast(undefined)
    state.setIsStarting(false)
    state.clearEngines()
  })

const enterDialogue = (
  deps: DialogueModeDeps,
  state: DialogueRoomState,
): Effect.Effect<void> => {
  const generation = state.bumpRoom()
  if (state.transcript().entries.length === 0) {
    return Effect.sync(() => {
      state.setPhase("setup")
      state.clearEngines()
    })
  }
  state.setPhase("running")
  return resumeEngines(deps, state, generation)
}

const resumeEngines = (
  deps: DialogueModeDeps,
  state: DialogueRoomState,
  generation: number,
) =>
  Effect.gen(function* () {
    const current = state.setup()
    state.mountEngines(current)
    state.setResolvedCast(resolvedFrom(deps, current))
    yield* waitForEngines(deps, current)
    if (!state.roomIsCurrent(generation)) {
      return
    }
  })

const beginStart = (
  deps: DialogueModeDeps,
  state: DialogueRoomState,
): Effect.Effect<void, never, Storage> =>
  Effect.gen(function* () {
    if (
      state.isStarting() ||
      state.phase() !== "setup" ||
      state.workspaceMode() !== "dialogue"
    ) {
      return
    }
    const current = yield* trimmedSetup(state)
    const stampAt = new Date(yield* Clock.currentTimeMillis).toISOString()
    const decision = startDialogue({
      setup: current,
      catalog: deps.catalog(),
      enabledProviderIds: deps.enabledProviderIds(),
      stampAt,
    })
    yield* Either.match(decision, {
      onLeft: (problems) =>
        Effect.sync(() => state.setStartProblems(problems)),
      onRight: (plan) => runStart(deps, state, plan),
    })
  })

const trimmedSetup = (
  state: DialogueRoomState,
): Effect.Effect<DialogueSetup, never, Storage> =>
  Effect.gen(function* () {
    const current = state.setup()
    const topic = current.topic.trim()
    if (topic === current.topic) {
      return current
    }
    const next = withTopic(current, topic)
    yield* state.commitSetup(next)
    return next
  })

const runStart = (
  deps: DialogueModeDeps,
  state: DialogueRoomState,
  plan: StartPlan,
): Effect.Effect<void, never, Storage> => {
  const generation = state.bumpRoom()
  state.setIsStarting(true)
  return Effect.gen(function* () {
    const cleared = yield* clearDialogueTranscript().pipe(
      Effect.as(true),
      Effect.catchAll(() =>
        Effect.logWarning("dialogue transcript did not clear").pipe(
          Effect.as(false),
        ),
      ),
    )
    if (!cleared || !state.roomIsCurrent(generation)) {
      return
    }
    state.setTranscript(emptyDialogueTranscript)
    state.mountEngines(state.setup())
    state.setResolvedCast(plan.resolvedCast)
    yield* waitForEngines(deps, state.setup())
    if (!state.roomIsCurrent(generation)) {
      return
    }
    yield* persistOpening(plan)
    yield* loadDialogueTranscript().pipe(
      Effect.tap((loaded) => Effect.sync(() => state.setTranscript(loaded))),
    )
    if (!state.roomIsCurrent(generation)) {
      return
    }
    state.setPhase("running")
  }).pipe(
    Effect.ensuring(
      Effect.sync(() => {
        if (state.roomIsCurrent(generation)) {
          state.setIsStarting(false)
        }
      }),
    ),
  )
}

const persistOpening = (plan: StartPlan) =>
  Option.match(plan.openingEntry, {
    onNone: () => Effect.void,
    onSome: (opening) =>
      appendTranscriptEntry(opening).pipe(
        Effect.catchAll(() =>
          Effect.logWarning("dialogue opening line did not save"),
        ),
      ),
  })

const waitForEngines = (deps: DialogueModeDeps, current: DialogueSetup) =>
  waitEngineTargets({
    panels: enginePanelsFor(current),
    frames: deps.engineFrames,
    timeoutMs: engineTargetTimeoutMs,
  }).pipe(
    Effect.catchTag("EngineNotReady", (error) =>
      Effect.logWarning("dialogue engines not ready", error.panelIds.join(",")),
    ),
  )

const resolvedFrom = (
  deps: DialogueModeDeps,
  current: DialogueSetup,
): ResolvedCast | undefined =>
  Either.match(resolveCast({ setup: current, catalog: deps.catalog() }), {
    onLeft: () => undefined,
    onRight: (resolved) => resolved,
  })
