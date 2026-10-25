import { Clock, Effect } from "effect"
import { batch } from "solid-js"
import { appendTranscriptEntry } from "@domain/dialogue/append-transcript-entry"
import {
  isVendorSeat,
  isYouSeat,
  youDisplayName,
} from "@domain/dialogue/dialogue-setup"
import {
  advanceCursor,
  canNext,
  setBusy,
  type FloorState,
} from "@domain/dialogue/floor-state"
import { runTurn } from "@domain/dialogue/run-turn"
import type { TranscriptEntry } from "@domain/dialogue/transcript-entry"
import { isTurnFailed, isTurnSucceeded } from "@domain/dialogue/turn-outcome"
import type { Messaging } from "@domain/ports/messaging"
import type { Storage } from "@domain/ports/storage"
import {
  failedBubble,
  withSeatFailure,
  withoutSeatFailure,
  type FailedBubble,
} from "./model"
import type { DialogueFloorHost } from "./view-model"

type Update<Value> = (next: Value | ((current: Value) => Value)) => void

export const createTurnActions = (input: {
  readonly host: DialogueFloorHost
  readonly floorState: () => FloorState
  readonly setFloorState: Update<FloorState>
  readonly failures: () => readonly FailedBubble[]
  readonly setFailures: Update<readonly FailedBubble[]>
  readonly setComposerDraft: (text: string) => void
  readonly turnGeneration: () => number
  readonly syncPhase: () => void
}) => {
  const stillCurrent = (generation: number): boolean => {
    input.syncPhase()
    return input.turnGeneration() === generation
  }

  const releaseIfCurrent = (ownsTurn: boolean, generation: number): void => {
    if (!ownsTurn || !stillCurrent(generation)) {
      return
    }
    input.setFloorState((current) => setBusy(current, false))
  }

  const saveEntry = (entry: TranscriptEntry) =>
    appendTranscriptEntry(entry).pipe(
      Effect.as(true),
      Effect.catchAll(() =>
        Effect.logWarning("dialogue line did not save").pipe(Effect.as(false)),
      ),
    )

  const reloadHostTranscript = () =>
    Effect.promise(() => input.host.reloadTranscript()).pipe(
      Effect.catchAll(() =>
        Effect.logWarning("dialogue transcript did not reload"),
      ),
    )

  const next = (): Effect.Effect<void, never, Messaging | Storage> => {
    let generation = 0
    let ownsTurn = false
    return Effect.gen(function* () {
      input.syncPhase()
      const state = input.floorState()
      const cast = input.host.setup().cast
      const seat = cast[state.cursor]
      if (
        input.host.phase() !== "running" ||
        seat === undefined ||
        !canNext(state, seat)
      ) {
        return
      }
      const resolved = input.host.resolvedCast()
      const target = input.host.resolveTargetForCastIndex(state.cursor)
      const row =
        resolved === undefined ? undefined : resolved.speakers[state.cursor]
      if (
        resolved === undefined ||
        target === undefined ||
        row === undefined ||
        !isVendorSeat(row.seat)
      ) {
        yield* Effect.logWarning(
          "dialogue floor cannot reach this seat",
          state.cursor,
        )
        return
      }
      const cursor = state.cursor
      const castLength = cast.length
      generation = input.turnGeneration()
      ownsTurn = true
      input.setFloorState(setBusy(state, true))
      const outcome = yield* runTurn({
        target,
        speaker: row.speaker,
        cast: resolved.cast,
        transcript: input.host.transcript().entries,
      })
      // A leave bumps the generation so this result is dropped.
      if (!stillCurrent(generation)) {
        return
      }
      if (isTurnSucceeded(outcome)) {
        const saved = yield* saveEntry(outcome.entry)
        if (!saved || !stillCurrent(generation)) {
          return
        }
        yield* reloadHostTranscript()
        if (!stillCurrent(generation)) {
          return
        }
        batch(() => {
          input.setFloorState((current) => advanceCursor(current, castLength))
          input.setFailures((current) => withoutSeatFailure(current, cursor))
        })
        return
      }
      if (!isTurnFailed(outcome)) {
        return
      }
      const at = new Date(yield* Clock.currentTimeMillis).toISOString()
      if (!stillCurrent(generation)) {
        return
      }
      input.setFailures((current) =>
        withSeatFailure(
          current,
          failedBubble({
            castIndex: cursor,
            reason: outcome.reason,
            raw: outcome.raw,
            at,
          }),
        ),
      )
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          releaseIfCurrent(ownsTurn, generation)
        }),
      ),
    )
  }

  const sendUserLine = (
    text: string,
  ): Effect.Effect<void, never, Storage> => {
    let generation = 0
    let ownsTurn = false
    return Effect.gen(function* () {
      input.syncPhase()
      const trimmed = text.trim()
      if (trimmed.length === 0) {
        return
      }
      const state = input.floorState()
      const cast = input.host.setup().cast
      const seat = cast[state.cursor]
      if (
        input.host.phase() !== "running" ||
        state.busy ||
        seat === undefined ||
        !isYouSeat(seat)
      ) {
        return
      }
      const castLength = cast.length
      generation = input.turnGeneration()
      ownsTurn = true
      input.setFloorState(setBusy(state, true))
      const at = new Date(yield* Clock.currentTimeMillis).toISOString()
      if (!stillCurrent(generation)) {
        return
      }
      const saved = yield* saveEntry({
        speaker: youDisplayName,
        text: trimmed,
        at,
      })
      if (!saved || !stillCurrent(generation)) {
        return
      }
      yield* reloadHostTranscript()
      if (!stillCurrent(generation)) {
        return
      }
      batch(() => {
        input.setFloorState((current) => advanceCursor(current, castLength))
        input.setComposerDraft("")
      })
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          releaseIfCurrent(ownsTurn, generation)
        }),
      ),
    )
  }

  return { next, sendUserLine }
}
