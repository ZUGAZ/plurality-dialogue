import { Effect } from "effect"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"

export const openGoogleTemporaryChat = (): Effect.Effect<
  void,
  TemporaryChatUnavailable
> =>
  Effect.fail(
    new TemporaryChatUnavailable({
      reason: "Google AI Mode has no temporary chat",
    }),
  )
