import { Effect } from "effect"
import type { PendingImage } from "../../../domain/broadcast/pending-image"
import { ImageAttachFailed } from "../../../domain/ports/provider-page"
import { assignFileInput } from "../assign-file-input"
import { primaryFileInputSelector } from "./selectors"

export const attachClaudeImages = (
  root: ParentNode,
  images: ReadonlyArray<PendingImage>,
): Effect.Effect<void, ImageAttachFailed> => {
  if (images.length === 0) {
    return Effect.void
  }
  const input = fileInput(root)
  if (input === undefined) {
    return Effect.fail(new ImageAttachFailed({ reason: "file input not found" }))
  }
  return assignFileInput(input, images)
}

const fileInput = (root: ParentNode): HTMLInputElement | undefined => {
  const node = root.querySelector(primaryFileInputSelector)
  if (node instanceof HTMLInputElement && node.type === "file") {
    return node
  }
  return undefined
}
