import { Effect } from "effect"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"

export const openGrokTemporaryChat = (): Effect.Effect<
  void,
  TemporaryChatUnavailable
> =>
  Effect.fail(
    new TemporaryChatUnavailable({
      reason: "Grok has no temporary chat",
    }),
  )
