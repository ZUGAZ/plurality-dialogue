import type { Effect } from "effect"
import { Context, Data } from "effect"
import type { FillAndSubmit } from "../broadcast/commands/fill-and-submit"
import type { FillComposer } from "../broadcast/commands/fill-composer"
import type { PanelTarget } from "../broadcast/panel-target"
import type { PanelCommandResponse } from "../messaging/panel-command-response"

export class MessagingSendFailed extends Data.TaggedError(
  "MessagingSendFailed",
)<{
  readonly cause: unknown
}> {}

export class MessagingFault extends Data.TaggedError("MessagingFault")<{
  readonly cause: unknown
}> {}

export class Messaging extends Context.Tag("Messaging")<
  Messaging,
  {
    readonly send: (
      message: unknown,
    ) => Effect.Effect<unknown, MessagingSendFailed>
    readonly sendToFrame: (
      target: PanelTarget,
      message: FillComposer | FillAndSubmit,
    ) => Effect.Effect<PanelCommandResponse, MessagingFault>
  }
>() {}
