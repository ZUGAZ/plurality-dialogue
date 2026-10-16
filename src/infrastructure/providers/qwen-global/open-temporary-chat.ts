import { Effect } from "effect"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"

export const openQwenGlobalTemporaryChat = (): Effect.Effect<
  void,
  TemporaryChatUnavailable
> =>
  Effect.fail(
    new TemporaryChatUnavailable({
      reason: "Qwen Global has no temporary chat",
    }),
  )
