import { Effect } from "effect"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"

export const openDeepseekTemporaryChat = (): Effect.Effect<
  void,
  TemporaryChatUnavailable
> =>
  Effect.fail(
    new TemporaryChatUnavailable({
      reason: "DeepSeek has no temporary chat",
    }),
  )
