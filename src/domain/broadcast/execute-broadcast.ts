import { Effect } from "effect"
import type { BroadcastCommand } from "./commands"
import { BroadcastTransportUnavailable } from "./errors"

/** Transport is not wired; always fails. Same export is the fan-out seam. */
export const executeBroadcast = (
  command: BroadcastCommand,
): Effect.Effect<never, BroadcastTransportUnavailable> =>
  Effect.fail(new BroadcastTransportUnavailable({ command }))
