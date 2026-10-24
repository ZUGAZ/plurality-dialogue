import { Effect, Either, Option } from "effect"
import { loadPanelInstruction } from "../role/assign-panel-role"
import { composePanelPrompt } from "./compose-panel-prompt"
import { FillAndSubmit } from "./commands/fill-and-submit"
import {
  executeBroadcast,
  executeBroadcastCommands,
  type TargetCommand,
} from "./execute-broadcast"
import type { PanelTarget } from "./panel-target"
import { panelSlotIndex } from "./panel-slot-index"
import { prepareFillCommand, prepareSendCommand } from "./prepare-command"
import type { PendingImage } from "./pending-image"

export type BroadcastSendTargets = {
  readonly targets: ReadonlyArray<PanelTarget>
  readonly panelIds: ReadonlyArray<string>
}

export const broadcastFill = Effect.fn("broadcastFill")(function* (
  rawText: string,
  targets: ReadonlyArray<PanelTarget>,
) {
  return yield* prepareFillCommand(rawText).pipe(
    Either.match({
      onLeft: (error) => Effect.fail(error),
      onRight: (command) => executeBroadcast(command, targets),
    }),
  )
})

// A blank draft fails here, before any role lookup: the instruction is a
// prefix on the user's prompt, not a message of its own.
export const broadcastFillSend = Effect.fn("broadcastFillSend")(function* (
  rawText: string,
  images: ReadonlyArray<PendingImage>,
  send: BroadcastSendTargets,
) {
  const shared = yield* prepareSendCommand(rawText, images).pipe(
    Either.match({
      onLeft: (error) => Effect.fail(error),
      onRight: (command) => Effect.succeed(command),
    }),
  )
  const rows = yield* Effect.forEach(send.targets, (target) =>
    instructionForTarget(send.panelIds, target.panelId).pipe(
      Effect.map(
        (instruction): TargetCommand => ({
          target,
          command: commandForTarget(shared, instruction),
        }),
      ),
    ),
  )
  return yield* executeBroadcastCommands(rows)
})

const instructionForTarget = Effect.fn("instructionForTarget")(function* (
  panelIds: ReadonlyArray<string>,
  panelId: string,
) {
  return yield* Option.match(panelSlotIndex(panelIds, panelId), {
    onNone: () => Effect.succeed(Option.none<string>()),
    onSome: (index) => loadPanelInstruction(index),
  })
})

const commandForTarget = (
  shared: FillAndSubmit,
  instruction: Option.Option<string>,
): FillAndSubmit =>
  FillAndSubmit.make({
    prompt: composePanelPrompt(instruction, shared.prompt),
    images: shared.images,
  })
