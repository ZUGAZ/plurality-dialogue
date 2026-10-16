import { Effect } from "effect"
import type { PendingImage } from "../../../domain/broadcast/pending-image"
import { ImageAttachFailed } from "../../../domain/ports/provider-page"

export const attachQwenChinaImages = (
  images: ReadonlyArray<PendingImage>,
): Effect.Effect<void, ImageAttachFailed> => {
  if (images.length === 0) {
    return Effect.void
  }
  return Effect.fail(
    new ImageAttachFailed({
      reason: "Qwen China has no image upload",
    }),
  )
}
