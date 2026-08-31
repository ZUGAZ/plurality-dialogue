import { Effect, Either } from "effect"
import { executeBroadcast } from "./execute-broadcast"
import { prepareFillCommand, prepareSendCommand } from "./prepare-command"

export const broadcastFill = Effect.fn("broadcastFill")(function* (
  rawText: string,
) {
  return yield* prepareFillCommand(rawText).pipe(
    Either.match({
      onLeft: (error) => Effect.fail(error),
      onRight: executeBroadcast,
    }),
  )
})

export const broadcastFillSend = Effect.fn("broadcastFillSend")(function* (
  rawText: string,
) {
  return yield* prepareSendCommand(rawText).pipe(
    Either.match({
      onLeft: (error) => Effect.fail(error),
      onRight: executeBroadcast,
    }),
  )
})
