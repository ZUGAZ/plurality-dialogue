import { Effect, Either } from "effect"
import type { PendingImage } from "./pending-image"
import { executeBroadcast } from "./execute-broadcast"
import type { PanelTarget } from "./panel-target"
import { prepareFillCommand, prepareSendCommand } from "./prepare-command"

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

export const broadcastFillSend = Effect.fn("broadcastFillSend")(function* (
  rawText: string,
  images: ReadonlyArray<PendingImage>,
  targets: ReadonlyArray<PanelTarget>,
) {
  return yield* prepareSendCommand(rawText, images).pipe(
    Either.match({
      onLeft: (error) => Effect.fail(error),
      onRight: (command) => executeBroadcast(command, targets),
    }),
  )
})
