import type { Effect } from "effect"
import { Context, Data } from "effect"
import type { BroadcastCommand } from "../broadcast/commands"
import type { PanelTarget } from "../broadcast/panel-target"
import type { FrameLocation } from "../messaging/frame-location"
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
      message: BroadcastCommand,
    ) => Effect.Effect<PanelCommandResponse, MessagingFault>
    readonly readFrameLocation: (
      target: PanelTarget,
    ) => Effect.Effect<FrameLocation, MessagingFault>
  }
>() {}
