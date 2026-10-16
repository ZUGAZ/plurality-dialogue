import { Effect } from "effect"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"

export const openDoubaoTemporaryChat = (): Effect.Effect<
  void,
  TemporaryChatUnavailable
> =>
  Effect.fail(
    new TemporaryChatUnavailable({
      reason: "Doubao has no temporary chat",
    }),
  )
