import { Effect } from "effect"
import { CaptureUnsupported } from "../../domain/ports/provider-page"

export const unsupportedCaptureReply = () =>
  Effect.fail(
    new CaptureUnsupported({
      reason: "reply capture not implemented for this provider",
    }),
  )
