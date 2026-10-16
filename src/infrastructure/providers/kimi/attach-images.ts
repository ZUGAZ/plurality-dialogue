import { Effect } from "effect"
import type { PendingImage } from "../../../domain/broadcast/pending-image"
import { ImageAttachFailed } from "../../../domain/ports/provider-page"
import { requestPageFileAssign } from "../request-page-file-assign"
import { primaryFileInputSelector } from "./selectors"

export const attachKimiImages = (
  images: ReadonlyArray<PendingImage>,
): Effect.Effect<void, ImageAttachFailed> => {
  if (images.length === 0) {
    return Effect.void
  }
  return requestPageFileAssign({
    selector: primaryFileInputSelector,
    images,
  })
}
