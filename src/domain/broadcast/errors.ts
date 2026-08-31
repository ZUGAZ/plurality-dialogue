import { Data } from "effect"
import type { BroadcastCommand } from "./commands"

export class ComposerEmpty extends Data.TaggedError("ComposerEmpty")<{
  readonly rawText: string
}> {}

export class BroadcastTransportUnavailable extends Data.TaggedError(
  "BroadcastTransportUnavailable",
)<{
  readonly command: BroadcastCommand
}> {}
