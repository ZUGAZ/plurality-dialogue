import type { Effect } from "effect"
import { Context, Data } from "effect"

export class MessagingSendFailed extends Data.TaggedError(
  "MessagingSendFailed",
)<{
  readonly cause: unknown
}> {}

export class Messaging extends Context.Tag("Messaging")<
  Messaging,
  {
    readonly send: (
      message: unknown,
    ) => Effect.Effect<unknown, MessagingSendFailed>
  }
>() {}
