import { Effect } from "effect"
import type { PendingImage } from "../../../domain/broadcast/pending-image"
import { ImageAttachFailed } from "../../../domain/ports/provider-page"
import { assignFileInput } from "../assign-file-input"
import {
  primaryFileInputSelector,
  uploadToolsSelector,
} from "./selectors"

export const attachGeminiImages = (
  images: ReadonlyArray<PendingImage>,
): Effect.Effect<void, ImageAttachFailed> => {
  if (images.length === 0) {
    return Effect.void
  }
  const present = fileInput()
  if (present !== undefined) {
    return assignFileInput(present, images)
  }
  return Effect.sync(clickUploadTools).pipe(
    Effect.flatMap(() => {
      const revealed = fileInput()
      if (revealed === undefined) {
        return Effect.fail(
          new ImageAttachFailed({ reason: "file input not found" }),
        )
      }
      return assignFileInput(revealed, images)
    }),
  )
}

const fileInput = (): HTMLInputElement | undefined => {
  const node = document.querySelector(primaryFileInputSelector)
  if (node instanceof HTMLInputElement && node.type === "file") {
    return node
  }
  return undefined
}

const clickUploadTools = (): void => {
  const button = document.querySelector(uploadToolsSelector)
  if (button instanceof HTMLElement) {
    button.click()
  }
}
